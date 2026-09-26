import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import { libraryQuerySchema } from "@/lib/security/librarySchemas";
import Song from "@/models/Song";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = libraryQuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
    artist: searchParams.get("artist") ?? "",
    genre: searchParams.get("genre") ?? "",
    language: searchParams.get("language") ?? "",
    duration: searchParams.get("duration") ?? "all",
    sort: searchParams.get("sort") ?? "recent",
    scope: "mine",
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "40",
  });

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid upload library query." }, { status: 400 });
  }

  const query = parsed.data;
  await connectDB();

  const filter = {
    uploaderId: userId,
    status: "ready",
    isActive: true,
  };

  if (query.artist) filter.artist = { $regex: `^${query.artist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
  if (query.genre) filter.genre = { $regex: `^${query.genre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
  if (query.language) filter.language = { $regex: `^${query.language.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
  if (query.duration === "short") filter.durationSeconds = { $lt: 240 };
  if (query.duration === "long") filter.durationSeconds = { $gte: 240 };

  if (query.q) {
    const escapedQuery = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: escapedQuery, $options: "i" } },
      { artist: { $regex: escapedQuery, $options: "i" } },
      { album: { $regex: escapedQuery, $options: "i" } },
      { genre: { $regex: escapedQuery, $options: "i" } },
      { language: { $regex: escapedQuery, $options: "i" } },
    ];
  }

  let sort = { createdAt: -1, _id: -1 };
  if (query.sort === "title") sort = { title: 1, _id: 1 };
  if (query.sort === "artist") sort = { artist: 1, title: 1, _id: 1 };
  if (query.sort === "duration") sort = { durationSeconds: 1, title: 1, _id: 1 };

  const projection = "title artist album genre language durationSeconds fileSize createdAt uploaderId";
  const skip = (query.page - 1) * query.limit;

  const [songs, total] = await Promise.all([
    Song.find(filter).select(projection).sort(sort).skip(skip).limit(query.limit).lean(),
    Song.countDocuments(filter),
  ]);

  const response = NextResponse.json({
    success: true,
    songs: songs.map((song) => ({
      id: String(song._id),
      title: song.title || "Untitled song",
      artist: song.artist || "Unknown artist",
      album: song.album || "",
      genre: song.genre || "Other",
      language: song.language || "Unknown",
      durationSeconds: Number(song.durationSeconds) || 0,
      fileSize: Number(song.fileSize) || 0,
      createdAt: song.createdAt || null,
      uploaderId: String(song.uploaderId),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      hasNextPage: query.page * query.limit < total,
      hasPreviousPage: query.page > 1,
    },
  });

  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Vary", "Cookie");
  return response;
}