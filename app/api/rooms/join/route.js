import { connectDB } from "@/lib/db/mongodb";
import { getClientIp } from "@/lib/security/request";
import { hashRoomCode } from "@/lib/security/roomCode";
import { joinRoomSchema } from "@/lib/security/roomSchemas";
import { jsonError, requireUser } from "@/lib/security/roomAuth";
import { canJoinRoom } from "@/lib/security/roomRateLimit";
import Room from "@/models/Room";
import { emitMemberJoined } from "@/lib/realtime/realtimeHub";

function getUserCard(user) {
  if (!user) return null;
  return {
    id: String(user._id || user.id),
    name: user.name || "Suno user",
    image: user.image || null,
  };
}

function serialiseRoom(room, currentUserId) {
  const members = (room.members || []).map((member) => ({
    userId: String(member.userId?._id || member.userId),
    role: member.role,
    joinedAt: member.joinedAt,
    lastSeenAt: member.lastSeenAt,
    user: getUserCard(member.userId),
  }));

  return {
    id: String(room._id),
    name: room.name,
    creatorId: String(room.creatorId?._id || room.creatorId),
    creator: getUserCard(room.creatorId),
    status: room.status,
    maxMembers: room.maxMembers,
    memberCount: members.length,
    members,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    closedAt: room.closedAt || null,
    currentUserRole:
      String(room.creatorId?._id || room.creatorId) === String(currentUserId)
        ? "creator"
        : members.find((member) => member.userId === String(currentUserId))?.role || null,
  };
}

export async function POST(request) {
  const authResult = await requireUser();
  if (!authResult.ok) return jsonError("Authentication required.", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const parsed = joinRoomSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid room code.");
  }

  const ip = getClientIp(request);
  const limit = await canJoinRoom(authResult.session.user.id, ip);
  if (!limit.allowed) {
    return jsonError("Too many join attempts. Please try again later.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  await connectDB();
  const userId = authResult.session.user.id;
  const codeHash = hashRoomCode(parsed.data.code);

  const foundRoom = await Room.findOne({ status: "active", codeHash }).select("+codeHash").lean();
  if (!foundRoom) {
    return jsonError("That room code is invalid or the room has been closed.", 404);
  }

  const alreadyMember = foundRoom.members?.some(
    (member) => String(member.userId) === String(userId),
  );

  if (!alreadyMember && (foundRoom.members?.length || 0) >= (foundRoom.maxMembers || 10)) {
    return jsonError("This room is full. A room can have up to 10 people.", 409);
  }

  let room;

  if (alreadyMember) {
    room = await Room.findById(foundRoom._id);
    await Room.updateOne(
      { _id: foundRoom._id, "members.userId": userId },
      { $set: { "members.$.lastSeenAt": new Date() } },
    );
  } else {
    room = await Room.findOneAndUpdate(
      {
        _id: foundRoom._id,
        status: "active",
        "members.userId": { $ne: userId },
        $expr: { $lt: [{ $size: "$members" }, "$maxMembers"] },
      },
      {
        $push: {
          members: {
            userId,
            role: "member",
            joinedAt: new Date(),
            lastSeenAt: new Date(),
          },
        },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" },
    );
  }

  if (!room) {
    return jsonError("The room became full or was closed. Please try again.", 409);
  }

  const populated = await Room.findById(room._id)
    .populate({ path: "creatorId", select: "name image email" })
    .populate({ path: "members.userId", select: "name image" })
    .lean();

  if (!alreadyMember) {
    emitMemberJoined(room._id, userId);
  }

  return Response.json({
    success: true,
    alreadyMember,
    room: serialiseRoom(populated, userId),
  });
}