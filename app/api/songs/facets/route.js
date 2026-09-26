import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import Song from "@/models/Song";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapFacet(rows) {
  return rows.map((row) => ({
    name: row._id || "Unknown",
    count: Number(row.count) || 0,
  }));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
  }

  await connectDB();
  const match = { status: "ready", isActive: true };

  const [genres, languages, artists] = await Promise.all([
    Song.aggregate([
      { $match: { ...match, genre: { $exists: true, $ne: "" } } },
      { $group: { _id: "$genre", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 40 },
    ]),
    Song.aggregate([
      { $match: { ...match, language: { $exists: true, $ne: "" } } },
      { $group: { _id: "$language", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 40 },
    ]),
    Song.aggregate([
      { $match: { ...match, artist: { $exists: true, $ne: "" } } },
      { $group: { _id: "$artist", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 80 },
    ]),
  ]);

  const response = NextResponse.json({
    success: true,
    facets: {
      genres: mapFacet(genres),
      languages: mapFacet(languages),
      artists: mapFacet(artists),
    },
  });
  response.headers.set("Cache-Control", "private, max-age=120, stale-while-revalidate=300");
  response.headers.set("Vary", "Cookie");
  return response;
}