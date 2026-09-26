import { connectDB } from "@/lib/db/mongodb";
import { decryptRoomCode } from "@/lib/security/roomCode";
import { jsonError, requireUser } from "@/lib/security/roomAuth";
import { roomIdSchema } from "@/lib/security/roomSchemas";
import Room from "@/models/Room";

function getUserCard(user) {
  if (!user) return null;
  return {
    id: String(user._id || user.id),
    name: user.name || "Suno user",
    image: user.image || null,
  };
}

function serialiseQueue(queue) {
  const items = Array.isArray(queue?.items) ? queue.items : [];

  return items.map((item) => ({
    id: String(item._id),
    songId: String(item.songId?._id || item.songId),
    song: item.songId?._id
      ? {
          id: String(item.songId._id),
          title: item.songId.title || "Untitled song",
          artist: item.songId.artist || "Unknown artist",
          album: item.songId.album || "",
          durationSeconds: Number(item.songId.durationSeconds) || 0,
        }
      : null,
    addedBy: String(item.addedBy?._id || item.addedBy || ""),
    addedAt: item.addedAt || null,
    available: Boolean(item.songId?._id),
  }));
}

function serialiseRoom(room, currentUserId, secretCode = null) {
  const members = (room.members || []).map((member) => ({
    userId: String(member.userId?._id || member.userId),
    role: member.role,
    joinedAt: member.joinedAt,
    lastSeenAt: member.lastSeenAt,
    user: getUserCard(member.userId),
  }));

  const currentMember = members.find(
    (member) => member.userId === String(currentUserId),
  );

  const playbackSong = room.playback?.songId;

  return {
    id: String(room._id),
    name: room.name,
    creatorId: String(room.creatorId?._id || room.creatorId),
    creator: getUserCard(room.creatorId),
    status: room.status,
    maxMembers: room.maxMembers || 10,
    memberCount: members.length,
    members,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    closedAt: room.closedAt || null,
    stateRevision: Number(room.stateRevision) || 0,
    playback: room.playback
      ? {
          song: playbackSong?._id
            ? {
                id: String(playbackSong._id),
                title: playbackSong.title || "Untitled song",
                artist: playbackSong.artist || "Unknown artist",
                album: playbackSong.album || "",
                durationSeconds: Number(playbackSong.durationSeconds) || 0,
              }
            : null,
          songId: playbackSong?._id ? String(playbackSong._id) : null,
          queueItemId: room.playback.queueItemId
            ? String(room.playback.queueItemId)
            : null,
          isPlaying: Boolean(room.playback.isPlaying),
          positionSeconds: Number(room.playback.positionSeconds) || 0,
          changedAt: room.playback.changedAt || null,
          revision: Number(room.playback.revision) || 0,
          updatedBy: String(room.playback.updatedBy || ""),
        }
      : null,
    queue: {
      items: serialiseQueue(room.queue),
      currentItemId: room.queue?.currentItemId
        ? String(room.queue.currentItemId)
        : null,
      revision: Number(room.queue?.revision) || 0,
    },
    currentUserRole:
      String(room.creatorId?._id || room.creatorId) === String(currentUserId)
        ? "creator"
        : currentMember?.role || null,
    secretCode: secretCode || null,
  };
}

export async function GET(request, { params }) {
  const authResult = await requireUser();
  if (!authResult.ok) return jsonError("Authentication required.", 401);

  const resolvedParams = await params;
  const parsedId = roomIdSchema.safeParse(resolvedParams?.roomId);
  if (!parsedId.success) return jsonError("Invalid room id.", 400);

  await connectDB();
  const userId = authResult.session.user.id;

  const room = await Room.findOne({
    _id: parsedId.data,
    "members.userId": userId,
  })
    .select("+codeCiphertext")
    .populate({ path: "creatorId", select: "name image email" })
    .populate({ path: "members.userId", select: "name image" })
    .populate({
      path: "playback.songId",
      select: "title artist album durationSeconds uploaderId",
    })
    .populate({
      path: "queue.items.songId",
      select: "title artist album durationSeconds uploaderId",
    })
    .lean();

  if (!room) return jsonError("Room not found or you are not a member.", 404);

  let secretCode = null;
  const isCreator =
    String(room.creatorId?._id || room.creatorId) === String(userId);

  if (isCreator && room.codeCiphertext) {
    try {
      secretCode = decryptRoomCode(room.codeCiphertext);
    } catch (error) {
      console.error("[Suno] Could not decrypt room code:", error);
    }
  }

  await Room.updateOne(
    { _id: room._id, "members.userId": userId },
    { $set: { "members.$.lastSeenAt": new Date() } },
  );

  return Response.json({
    success: true,
    room: serialiseRoom(room, userId, secretCode),
  });
}