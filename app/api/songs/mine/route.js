import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import Song from "@/models/Song";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  await connectDB();

  const songs = await Song.find({
    uploaderId: userId,
    status: "ready",
    isActive: true,
  })
    .select("title artist album durationSeconds fileSize createdAt")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({
    success: true,
    songs: songs.map((song) => ({
      id: song._id.toString(),
      title: song.title,
      artist: song.artist,
      album: song.album,
      durationSeconds: song.durationSeconds,
      fileSize: song.fileSize,
      createdAt: song.createdAt,
    })),
  });
}