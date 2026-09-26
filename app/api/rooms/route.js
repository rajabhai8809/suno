import { connectDB } from "@/lib/db/mongodb";
import { createRoomSchema } from "@/lib/security/roomSchemas";
import { encryptRoomCode, formatRoomCode, generateRoomCode, hashRoomCode } from "@/lib/security/roomCode";
import { jsonError, requireUser } from "@/lib/security/roomAuth";
import { canCreateRoom } from "@/lib/security/roomRateLimit";
import Room from "@/models/Room";
import User from "@/models/User";

const MAX_MEMBERS = 10;

function getUserCard(user) {
  if (!user) return null;
  return {
    id: String(user._id || user.id),
    name: user.name || "Suno user",
    image: user.image || null,
  };
}

function serialiseRoom(room, currentUserId, secretCode = null) {
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
    maxMembers: room.maxMembers || MAX_MEMBERS,
    memberCount: members.length,
    members,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    closedAt: room.closedAt || null,
    currentUserRole:
      String(room.creatorId?._id || room.creatorId) === String(currentUserId)
        ? "creator"
        : members.find((member) => member.userId === String(currentUserId))?.role || null,
    secretCode: secretCode ? formatRoomCode(secretCode) : null,
  };
}

function populateRoom(query) {
  return query
    .populate({ path: "creatorId", select: "name image email" })
    .populate({ path: "members.userId", select: "name image" });
}

export async function GET() {
  const authResult = await requireUser();
  if (!authResult.ok) return jsonError("Authentication required.", 401);

  await connectDB();
  const currentUserId = authResult.session.user.id;

  const rooms = await populateRoom(
    Room.find({ "members.userId": currentUserId })
      .sort({ status: 1, updatedAt: -1 })
      .limit(50),
  ).lean();

  const visibleRooms = rooms.map((room) => serialiseRoom(room, currentUserId));

  return Response.json({ success: true, rooms: visibleRooms });
}

export async function POST(request) {
  const authResult = await requireUser();
  if (!authResult.ok) return jsonError("Authentication required.", 401);

  const limit = await canCreateRoom(authResult.session.user.id);
  if (!limit.allowed) {
    return jsonError("Too many rooms created recently. Please try again later.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid room details.");
  }

  await connectDB();

  const creator = await User.findById(authResult.session.user.id).select("name image isActive").lean();
  if (!creator?.isActive) return jsonError("Your account is not active.", 403);

  // A fresh high-entropy code is retried in the extremely unlikely event of a hash collision.
  let room;
  let code;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    code = generateRoomCode();
    try {
      room = await Room.create({
        name: parsed.data.name,
        creatorId: creator._id,
        codeHash: hashRoomCode(code),
        codeCiphertext: encryptRoomCode(code),
        maxMembers: MAX_MEMBERS,
        members: [
          {
            userId: creator._id,
            role: "creator",
            joinedAt: new Date(),
            lastSeenAt: new Date(),
          },
        ],
      });
      break;
    } catch (error) {
      if (error?.code !== 11000 || attempt === 2) throw error;
    }
  }

  const roomDoc = await populateRoom(
    Room.findById(room._id)
  ).lean();

  return Response.json(
    {
      success: true,
      room: serialiseRoom(roomDoc, authResult.session.user.id, code),
      message: "Room created. Share the secret code with your friends.",
    },
    { status: 201 },
  );
}