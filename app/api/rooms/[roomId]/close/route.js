import { connectDB } from "@/lib/db/mongodb";
import { jsonError, requireUser } from "@/lib/security/roomAuth";
import { roomIdSchema } from "@/lib/security/roomSchemas";
import Room from "@/models/Room";
import { emitRoomClosed } from "@/lib/realtime/realtimeHub";

export async function POST(request, { params }) {
  const authResult = await requireUser();
  if (!authResult.ok) return jsonError("Authentication required.", 401);

  const resolvedParams = await params;
  const parsedId = roomIdSchema.safeParse(resolvedParams?.roomId);
  if (!parsedId.success) return jsonError("Invalid room id.", 400);

  await connectDB();
  const userId = authResult.session.user.id;

  const room = await Room.findById(parsedId.data).select("creatorId status");
  if (!room) return jsonError("Room not found.", 404);

  if (String(room.creatorId) !== String(userId)) {
    return jsonError("Only the room creator can close this room.", 403);
  }

  if (room.status === "closed") {
    return Response.json({ success: true, message: "Room is already closed." });
  }

  await Room.updateOne(
    { _id: room._id, creatorId: userId, status: "active" },
    {
      $set: {
        status: "closed",
        closedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  emitRoomClosed(room._id, { reason: "creator-closed" });

  return Response.json({ success: true, message: "Room closed." });
}