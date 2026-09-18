import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongodb";
import { consumeAuthToken } from "@/lib/tokens";
import User from "@/models/User";

export const runtime = "nodejs";

export async function GET(request) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=INVALID_TOKEN", request.url));
  }

  try {
    await connectDB();

    const authToken = await consumeAuthToken(token, "email_verification");

    if (!authToken) {
      return NextResponse.redirect(new URL("/verify-email?error=INVALID_TOKEN", request.url));
    }

    const user = await User.findById(authToken.userId);

    if (!user || !user.isActive) {
      return NextResponse.redirect(new URL("/verify-email?error=INVALID_TOKEN", request.url));
    }

    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date();
      await user.save();
    }

    return NextResponse.redirect(new URL("/login?verified=1", request.url));
  } catch (error) {
    console.error("[Suno] Email verification error:", error);

    return NextResponse.redirect(new URL("/verify-email?error=SERVER_ERROR", request.url));
  }
}