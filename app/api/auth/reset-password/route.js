import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongodb";
import { hashPassword } from "@/lib/security/password";
import { isSameOrigin } from "@/lib/security/request";
import { resetPasswordSchema } from "@/lib/security/schemas";
import { consumeAuthToken } from "@/lib/tokens";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, message: "Invalid request origin" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || "Invalid password" },
        { status: 400 },
      );
    }

    await connectDB();

    const authToken = await consumeAuthToken(
      parsed.data.token,
      "password_reset",
    );

    if (!authToken) {
      return NextResponse.json(
        { success: false, message: "This reset link is invalid or expired." },
        { status: 400 },
      );
    }

    const user = await User.findById(authToken.userId).select("+passwordHash");

    if (!user || user.authProvider !== "credentials" || !user.isActive) {
      return NextResponse.json(
        { success: false, message: "This reset link is invalid or expired." },
        { status: 400 },
      );
    }

    user.passwordHash = await hashPassword(parsed.data.password);
    user.sessionVersion += 1;
    user.failedLoginCount = 0;
    user.lockUntil = null;
    user.lastLoginAt = null;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Please sign in again.",
    });
  } catch (error) {
    console.error("[Suno] Reset password error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to reset your password right now." },
      { status: 500 },
    );
  }
}