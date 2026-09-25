import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import { supabaseAdmin, SUNO_MUSIC_BUCKET } from "@/lib/supabase/admin";
import Song from "@/models/Song";

export const runtime = "nodejs";

export async function GET(request, context) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  const { songId } = await context.params;

  if (!mongoose.isValidObjectId(songId)) {
    return NextResponse.json(
      { success: false, message: "Invalid song id." },
      { status: 400 },
    );
  }

  await connectDB();

  const song = await Song.findOne({
    _id: songId,
    status: "ready",
    isActive: true,
  }).select("storagePath title").lean();

  if (!song) {
    return NextResponse.json(
      { success: false, message: "Song not found." },
      { status: 404 },
    );
  }

  const expiresIn = 15 * 60;

  const { data, error } = await supabaseAdmin.storage
    .from(SUNO_MUSIC_BUCKET)
    .createSignedUrl(song.storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("[Suno] Stream URL error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to prepare the song stream." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    success: true,
    url: data.signedUrl,
    expiresIn,
  });
}