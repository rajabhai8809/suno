import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import Room from "@/models/Room";
import Song from "@/models/Song";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialiseSong(song) {
  return {
    id: String(song._id),
    title: song.title || "Untitled song",
    artist: song.artist || "Unknown artist",
    album: song.album || "",
    durationSeconds: Number(song.durationSeconds) || 0,
    createdAt: song.createdAt || null,
    uploaderId: song.uploaderId ? String(song.uploaderId) : null,
  };
}

function serialiseRoom(room) {
  const currentSong = room.playback?.songId?._id ? {
    id: String(room.playback.songId._id),
    title: room.playback.songId.title || "Untitled song",
    artist: room.playback.songId.artist || "Unknown artist",
    durationSeconds: Number(room.playback.songId.durationSeconds) || 0,
  } : null;
  return {
    id: String(room._id), name: room.name, status: room.status,
    creatorId: String(room.creatorId?._id || room.creatorId),
    memberCount: Array.isArray(room.members) ? room.members.length : 0,
    maxMembers: Number(room.maxMembers) || 10,
    updatedAt: room.updatedAt || null, currentSong,
    isPlaying: Boolean(room.playback?.isPlaying),
  };
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });

  await connectDB();
  const baseFilter = { status: "ready", isActive: true };
  const mineFilter = { ...baseFilter, uploaderId: userId };
  const roomMembershipFilter = { "members.userId": userId, status: "active" };

  const [libraryStats, myUploads, recentSongs, recentUploads, activeRoomCount, rooms] = await Promise.all([
    Song.aggregate([
      { $match: baseFilter },
      { $group: { _id: null, count: { $sum: 1 }, totalSeconds: { $sum: "$durationSeconds" } } },
    ]),
    Song.countDocuments(mineFilter),
    Song.find(baseFilter).select("title artist album durationSeconds createdAt uploaderId").sort({ createdAt: -1, _id: -1 }).limit(8).lean(),
    Song.find(mineFilter).select("title artist album durationSeconds createdAt uploaderId").sort({ createdAt: -1, _id: -1 }).limit(4).lean(),
    Room.countDocuments(roomMembershipFilter),
    Room.find(roomMembershipFilter).select("name status creatorId members maxMembers updatedAt playback").populate({ path: "playback.songId", select: "title artist durationSeconds" }).sort({ updatedAt: -1, _id: -1 }).limit(5).lean(),
  ]);

  const aggregate = libraryStats[0] || { count: 0, totalSeconds: 0 };
  const response = NextResponse.json({
    success: true,
    data: {
      user: { id: String(userId), name: session.user.name || "Suno user", email: session.user.email || "", image: session.user.image || null },
      stats: { totalLibraryTracks: Number(aggregate.count) || 0, totalLibraryMinutes: Math.round((Number(aggregate.totalSeconds) || 0) / 60), myUploads, activeRooms: activeRoomCount },
      recentSongs: recentSongs.map(serialiseSong), recentUploads: recentUploads.map(serialiseSong), rooms: rooms.map(serialiseRoom),
    },
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Vary", "Cookie");
  return response;
}