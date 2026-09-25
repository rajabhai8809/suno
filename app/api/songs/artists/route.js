import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import Song from "@/models/Song";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  await connectDB();

  const artists = await Song.aggregate([
    {
      $match: {
        status: "ready",
        isActive: true,
        artist: {
          $exists: true,
          $ne: "",
        },
      },
    },
    {
      $group: {
        _id: "$artist",
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        count: -1,
        _id: 1,
      },
    },
    {
      $limit: 100,
    },
  ]);

  return NextResponse.json({
    success: true,
    artists: artists.map((artist) => ({
      name: artist._id,
      count: artist.count,
    })),
  });
}