import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import { supabaseAdmin, SUNO_MUSIC_BUCKET } from "@/lib/supabase/admin";
import { initiateSongUploadSchema } from "@/lib/security/songSchemas";
import { consumeRateLimit } from "@/lib/security/rateLimit";
import { getClientIp, isSameOrigin } from "@/lib/security/request";
import { MAX_SONG_SIZE_BYTES } from "@/lib/audio/metadata";
import Song from "@/models/Song";

export const runtime = "nodejs";

const USER_UPLOAD_LIMIT = 12;
const IP_UPLOAD_LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;
const UPLOAD_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

function safeFileName(filename) {
  return filename.replace(/[\\/]+/g, "_").slice(0, 255);
}

export async function POST(request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });

  const [userRate, ipRate] = await Promise.all([
    consumeRateLimit(`song-upload:user:${userId}`, USER_UPLOAD_LIMIT, WINDOW_MS),
    consumeRateLimit(`song-upload:ip:${getClientIp(request)}`, IP_UPLOAD_LIMIT, WINDOW_MS),
  ]);

  if (!userRate.allowed || !ipRate.allowed) return NextResponse.json({ success: false, message: "Upload limit reached. Please try again later." }, { status: 429 });

  try {
    const body = await request.json();
    const parsed = initiateSongUploadSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Invalid upload details." }, { status: 400 });

    const { fileName, fileSize } = parsed.data;
    const originalFilename = safeFileName(fileName);
    if (!originalFilename.toLowerCase().endsWith(".mp3")) return NextResponse.json({ success: false, message: "Only .mp3 files are allowed." }, { status: 400 });
    if (fileSize > MAX_SONG_SIZE_BYTES) return NextResponse.json({ success: false, message: "Maximum song size is 25 MB." }, { status: 413 });

    await connectDB();
    const storagePath = `songs/${crypto.randomUUID()}.mp3`;

    const song = await Song.create({
      uploaderId: userId,
      title: parsed.data.title || "Untitled song",
      artist: parsed.data.artist || "Unknown artist",
      album: parsed.data.album || null,
      genre: parsed.data.genre || "Other",
      language: parsed.data.language || "Unknown",
      originalFilename,
      storagePath,
      fileHash: crypto.createHash("sha256").update(`${userId}:${storagePath}`).digest("hex"),
      mimeType: "audio/mpeg",
      fileSize,
      durationSeconds: 0,
      status: "uploading",
      uploadExpiresAt: new Date(Date.now() + UPLOAD_TOKEN_TTL_MS),
    });

    const { data, error } = await supabaseAdmin.storage.from(SUNO_MUSIC_BUCKET).createSignedUploadUrl(storagePath, { upsert: false });
    if (error || !data?.token) {
      await Song.deleteOne({ _id: song._id });
      console.error("[Suno] Signed upload URL error:", error);
      return NextResponse.json({ success: false, message: "Unable to prepare the upload right now." }, { status: 503 });
    }

    return NextResponse.json({ success: true, uploadId: String(song._id), path: storagePath, token: data.token, expiresAt: song.uploadExpiresAt });
  } catch (error) {
    console.error("[Suno] Upload initiation error:", error);
    return NextResponse.json({ success: false, message: "Unable to start the upload." }, { status: 500 });
  }
}