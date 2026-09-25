import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import {
  cleanTitleFromFilename,
  inspectMp3,
} from "@/lib/audio/metadata";
import { supabaseAdmin, SUNO_MUSIC_BUCKET } from "@/lib/supabase/admin";
import { completeSongUploadSchema } from "@/lib/security/songSchemas";
import { consumeRateLimit } from "@/lib/security/rateLimit";
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

  const rate = await consumeRateLimit(
    `song-complete:user:${userId}`,
    20,
    60 * 60 * 1000,
  );

  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, message: "Too many upload attempts. Try later." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const parsed = completeSongUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid upload id." },
        { status: 400 },
      );
    }

    await connectDB();

    const song = await Song.findOneAndUpdate(
      {
        _id: parsed.data.uploadId,
        uploaderId: userId,
        status: "uploading",
      },
      {
        $set: {
          status: "processing",
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!song) {
      return NextResponse.json(
        {
          success: false,
          message: "Upload not found or already processed.",
        },
        { status: 404 },
      );
    }

    if (
      song.uploadExpiresAt &&
      song.uploadExpiresAt.getTime() < Date.now()
    ) {
      await supabaseAdmin.storage
        .from(SUNO_MUSIC_BUCKET)
        .remove([song.storagePath]);

      await Song.deleteOne({ _id: song._id });

      return NextResponse.json(
        { success: false, message: "The upload session expired." },
        { status: 410 },
      );
    }

    const { data: blob, error: downloadError } =
      await supabaseAdmin.storage
        .from(SUNO_MUSIC_BUCKET)
        .download(song.storagePath);

    if (downloadError || !blob) {
      await supabaseAdmin.storage
        .from(SUNO_MUSIC_BUCKET)
        .remove([song.storagePath]);

      await Song.deleteOne({ _id: song._id });

      console.error("[Suno] Uploaded object could not be read:", downloadError);

      return NextResponse.json(
        { success: false, message: "Uploaded file could not be verified." },
        { status: 422 },
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());

    if (buffer.length !== song.fileSize) {
      await supabaseAdmin.storage
        .from(SUNO_MUSIC_BUCKET)
        .remove([song.storagePath]);

      await Song.deleteOne({ _id: song._id });

      return NextResponse.json(
        { success: false, message: "Uploaded file size could not be verified." },
        { status: 422 },
      );
    }

    let inspected;

    try {
      inspected = await inspectMp3({
        buffer,
        fileName: song.originalFilename,
      });
    } catch (validationError) {
      await supabaseAdmin.storage
        .from(SUNO_MUSIC_BUCKET)
        .remove([song.storagePath]);

      await Song.deleteOne({ _id: song._id });

      return NextResponse.json(
        {
          success: false,
          message:
            validationError?.message || "The uploaded file is not a valid MP3.",
        },
        { status: 422 },
      );
    }

    const duplicate = await Song.findOne({
      uploaderId: userId,
      fileHash: inspected.fileHash,
      _id: { $ne: song._id },
    }).select("_id title");

    if (duplicate) {
      await supabaseAdmin.storage
        .from(SUNO_MUSIC_BUCKET)
        .remove([song.storagePath]);

      await Song.deleteOne({ _id: song._id });

      return NextResponse.json(
        {
          success: false,
          code: "DUPLICATE_SONG",
          message: "You have already uploaded this song.",
          existingSongId: duplicate._id.toString(),
        },
        { status: 409 },
      );
    }

    const finalTitle =
      song.title &&
      song.title !== "Untitled song"
        ? song.title
        : inspected.title || cleanTitleFromFilename(song.originalFilename);

    const finalArtist =
      song.artist &&
      song.artist !== "Unknown artist"
        ? song.artist
        : inspected.artist || "Unknown artist";

    const finalAlbum = song.album || inspected.album || null;

    song.title = finalTitle.slice(0, 160);
    song.artist = finalArtist.slice(0, 160);
    song.album = finalAlbum ? finalAlbum.slice(0, 160) : null;
    song.fileHash = inspected.fileHash;
    song.mimeType = "audio/mpeg";
    song.fileSize = inspected.size;
    song.durationSeconds = inspected.durationSeconds;
    song.status = "ready";
    song.uploadExpiresAt = null;

    try {
      await song.save();
    } catch (saveError) {
      if (saveError?.code === 11000) {
        await supabaseAdmin.storage
          .from(SUNO_MUSIC_BUCKET)
          .remove([song.storagePath]);

        await Song.deleteOne({ _id: song._id });

        return NextResponse.json(
          {
            success: false,
            code: "DUPLICATE_SONG",
            message: "You have already uploaded this song.",
          },
          { status: 409 },
        );
      }

      throw saveError;
    }

    return NextResponse.json({
      success: true,
      song: {
        id: song._id.toString(),
        title: song.title,
        artist: song.artist,
        album: song.album,
        durationSeconds: song.durationSeconds,
        fileSize: song.fileSize,
      },
    });
  } catch (error) {
    console.error("[Suno] Upload completion error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to finalize the uploaded song." },
      { status: 500 },
    );
  }
}