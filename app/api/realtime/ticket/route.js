import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import { createRealtimeTicket } from "@/lib/realtime/realtimeTicket";
import { allowRealtimeTicketRequest } from "@/lib/security/realtimeSecurity.mjs";
import { roomIdSchema } from "@/lib/security/roomSchemas";
import Room from "@/models/Room";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return Response.json(
      { success: false, message: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const ip = String(
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown",
  );

  const limit = allowRealtimeTicketRequest(userId, ip);
  if (!limit.allowed) {
    return Response.json(
      { success: false, message: "Too many realtime connection requests. Please slow down." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  const roomId = new URL(request.url).searchParams.get("roomId");
  const parsed = roomIdSchema.safeParse(roomId);

  if (!parsed.success) {
    return Response.json(
      { success: false, message: "Invalid room id." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  await connectDB();

  const room = await Room.exists({
    _id: parsed.data,
    status: "active",
    "members.userId": userId,
  });

  if (!room) {
    return Response.json(
      { success: false, message: "Room not found or you are not a member." },
      { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  try {
    const ticket = createRealtimeTicket({ userId, roomId: parsed.data });

    return Response.json(
      {
        success: true,
        ticket,
        userId: String(userId),
        expiresIn: 120,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" } },
    );
  } catch (error) {
    console.error("[Suno] Failed to create realtime ticket:", error);
    return Response.json(
      { success: false, message: "Realtime service is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}