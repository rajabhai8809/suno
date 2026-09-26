import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import { libraryQuerySchema } from "@/lib/security/librarySchemas";
import Song from "@/models/Song";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let indexPromise = null;

async function ensureTextIndex() {
  if (!indexPromise) {
    indexPromise = Song.collection
      .createIndex(
        { title: "text", artist: "text", album: "text" },
        {
          name: "song_text_search",
          weights: { title: 8, artist: 5, album: 2 },
          default_language: "none",
          language_override: "sunoTextLanguage",
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

function serializeSong(song) {
  return {
    id: String(song._id),
    title: song.title || "Untitled song",
    artist: song.artist || "Unknown artist",
    album: song.album || "",
    genre: song.genre || "Other",
    language: song.language || "Unknown",
    durationSeconds: Number(song.durationSeconds) || 0,
    fileSize: Number(song.fileSize) || 0,
    createdAt: song.createdAt || null,
    uploaderId: song.uploaderId ? String(song.uploaderId) : null,
  };
}

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
    scope: searchParams.get("scope") ?? "all",
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "40",
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

  await connectDB();

  const filter = {
    status: "ready",
    isActive: true,
  };

  if (query.scope === "mine") {
    filter.uploaderId = userId;
  }

  if (query.q) {
    try {
      await ensureTextIndex();

      const escapedSearch = escapeRegex(query.q);

      filter.$or = [
        { $text: { $search: query.q } },
        { genre: { $regex: escapedSearch, $options: "i" } },
        { language: { $regex: escapedSearch, $options: "i" } },
      ];
    } catch (error) {
      console.error("[Suno] Song text index error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Search is temporarily unavailable.",
        },
        { status: 503 },
      );
    }
  }

  if (query.artist) {
    filter.artist = {
      $regex: `^${escapeRegex(query.artist)}$`,
      $options: "i",
    };
  }

  if (query.genre) {
    filter.genre = {
      $regex: `^${escapeRegex(query.genre)}$`,
      $options: "i",
    };
  }

  if (query.language) {
    filter.language = {
      $regex: `^${escapeRegex(query.language)}$`,
      $options: "i",
    };
  }

  if (query.duration === "short") {
    filter.durationSeconds = { $lt: 240 };
  }

  if (query.duration === "long") {
    filter.durationSeconds = { $gte: 240 };
  }

  const projection = {
    title: 1,
    artist: 1,
    album: 1,
    genre: 1,
    language: 1,
    durationSeconds: 1,
    fileSize: 1,
    createdAt: 1,
    uploaderId: 1,
  };

  let sort = { createdAt: -1, _id: -1 };

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
    sort = {
      score: { $meta: "textScore" },
      createdAt: -1,
      _id: -1,
    };
  }

  const skip = (query.page - 1) * query.limit;

  const [songs, total] = await Promise.all([
    Song.find(
      filter,
      query.q
        ? {
            ...projection,
            score: { $meta: "textScore" },
          }
        : projection,
    )
      .sort(sort)
      .skip(skip)
      .limit(query.limit)
      .lean(),

    Song.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  const response = NextResponse.json({
    success: true,
    songs: songs.map(serializeSong),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
    query: {
      scope: query.scope,
      q: query.q,
      artist: query.artist,
      genre: query.genre,
      language: query.language,
    },
  });

  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Vary", "Cookie");

  return response;
}