import { connectDB } from "@/lib/db/mongodb";
import { jsonError, requireUser } from "@/lib/security/roomAuth";
import { roomIdSchema } from "@/lib/security/roomSchemas";
import Room from "@/models/Room";
import { emitMemberRemoved } from "@/lib/realtime/realtimeHub";

export async function POST(request, { params }) {
  const authResult = await requireUser();
  if (!authResult.ok) return jsonError("Authentication required.", 401);

  const resolvedParams = await params;
  const parsedId = roomIdSchema.safeParse(resolvedParams?.roomId);
  if (!parsedId.success) return jsonError("Invalid room id.", 400);

  await connectDB();
  const userId = authResult.session.user.id;

  const room = await Room.findOne({ _id: parsedId.data });
  if (!room) return jsonError("Room not found.", 404);

  const member = room.members.find((item) => String(item.userId) === String(userId));
  if (!member) return jsonError("You are not a member of this room.", 403);

  if (String(room.creatorId) === String(userId) || member.role === "creator") {
    return jsonError("The room creator cannot leave. Close the room instead.", 403);
  }

  await Room.updateOne(
    { _id: room._id, "members.userId": userId },
    {
      $pull: { members: { userId } },
      $set: { updatedAt: new Date() },
    },
  );

  emitMemberRemoved(room._id, userId);

  return Response.json({ success: true, message: "You left the room." });
}