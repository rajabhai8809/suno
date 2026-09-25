import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import { supabaseAdmin, SUNO_MUSIC_BUCKET } from "@/lib/supabase/admin";
import { cancelSongUploadSchema } from "@/lib/security/songSchemas";
import { isSameOrigin } from "@/lib/security/request";
import Song from "@/models/Song";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Invalid request origin." },
      { status: 403 },
    );
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parsed = cancelSongUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid upload id." },
        { status: 400 },
      );
    }

    await connectDB();

    const song = await Song.findOne({
      _id: parsed.data.uploadId,
      uploaderId: userId,
      status: "uploading",
    }).select("storagePath");

    if (!song) {
      return NextResponse.json(
        { success: false, message: "Upload not found." },
        { status: 404 },
      );
    }

    await supabaseAdmin.storage
      .from(SUNO_MUSIC_BUCKET)
      .remove([song.storagePath]);

    await Song.deleteOne({ _id: song._id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Suno] Upload cancellation error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to cancel the upload." },
      { status: 500 },
    );
  }
}