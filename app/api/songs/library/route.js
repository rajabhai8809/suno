import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import { libraryQuerySchema } from "@/lib/security/librarySchemas";
import Song from "@/models/Song";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let indexPromise = null;

async function ensureIndexes() {
  if (!indexPromise) {
    indexPromise = Song.collection
      .createIndex(
        { title: "text", artist: "text", album: "text" },
        {
          name: "song_text_search",
          weights: {
            title: 8,
            artist: 5,
            album: 2,
          },
        },
      )
      .catch((error) => {
        indexPromise = null;
        throw error;
      });
  }

  await indexPromise;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);

  const parsed = libraryQuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
    artist: searchParams.get("artist") ?? "",
    duration: searchParams.get("duration") ?? "all",
    sort: searchParams.get("sort") ?? "recent",
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "20",
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid library query.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const query = parsed.data;
  const filter = {
    status: "ready",
    isActive: true,
  };

  if (query.q) {
    try {
      await connectDB();
      await ensureIndexes();
      filter.$text = { $search: query.q };
    } catch (error) {
      console.error("[Suno] Song search index error:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Search is temporarily unavailable. Please try again.",
        },
        { status: 503 },
      );
    }
  } else {
    await connectDB();
  }

  if (query.artist) {
    filter.artist = {
      $regex: `^${escapeRegex(query.artist)}$`,
      $options: "i",
    };
  }

  if (query.duration === "short") {
    filter.durationSeconds = { $lt: 240 };
  }

  if (query.duration === "long") {
    filter.durationSeconds = { $gte: 240 };
  }

  const skip = (query.page - 1) * query.limit;

  const projection = {
    title: 1,
    artist: 1,
    album: 1,
    durationSeconds: 1,
    fileSize: 1,
    createdAt: 1,
    uploaderId: 1,
  };

  let sort = { createdAt: -1 };

  if (query.sort === "title") {
    sort = { title: 1, _id: 1 };
  }

  if (query.sort === "artist") {
    sort = { artist: 1, title: 1, _id: 1 };
  }

  if (query.sort === "duration") {
    sort = { durationSeconds: 1, title: 1, _id: 1 };
  }

  if (query.sort === "relevance" && query.q) {
    sort = { score: { $meta: "textScore" }, createdAt: -1 };
  }

  const [songs, total] = await Promise.all([
    Song.find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Song.countDocuments(filter),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(total / query.limit),
  );

  return NextResponse.json({
    success: true,
    songs: songs.map((song) => ({
      id: song._id.toString(),
      title: song.title,
      artist: song.artist || "Unknown artist",
      album: song.album,
      durationSeconds: song.durationSeconds,
      fileSize: song.fileSize,
      createdAt: song.createdAt,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  });
}