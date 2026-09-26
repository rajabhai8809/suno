import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await connectDB();
    const healthy = mongoose.connection.readyState === 1;
    return Response.json({ ok: healthy, service: "suno", database: healthy ? "connected" : "disconnected", uptimeSeconds: Math.round(process.uptime()), latencyMs: Date.now() - startedAt }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return Response.json({ ok: false, service: "suno", database: "error", uptimeSeconds: Math.round(process.uptime()), latencyMs: Date.now() - startedAt }, { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}