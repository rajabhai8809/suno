import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongodb";
import { sendPasswordResetEmail } from "@/lib/mail";
import { consumeRateLimit } from "@/lib/security/rateLimit";
import { getClientIp, isSameOrigin } from "@/lib/security/request";
import { forgotPasswordSchema } from "@/lib/security/schemas";
import { issueAuthToken } from "@/lib/tokens";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, message: "Invalid request origin" }, { status: 403 });
  }

  const safeMessage = "If an account matches that email, a reset link will be sent.";

  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: true, message: safeMessage });
    }

    const { email } = parsed.data;

    const ipLimit = await consumeRateLimit(
      `reset:ip:${getClientIp(request)}`,
      5,
      60 * 60 * 1000,
    );

    const emailLimit = await consumeRateLimit(
      `reset:email:${email}`,
      3,
      60 * 60 * 1000,
    );

    if (!ipLimit.allowed || !emailLimit.allowed) {
      return NextResponse.json({ success: true, message: safeMessage });
    }

    await connectDB();

    const user = await User.findOne({
      email,
      authProvider: "credentials",
      isActive: true,
    });

    if (user) {
      const { token } = await issueAuthToken({
        userId: user._id,
        purpose: "password_reset",
        expiresInMs: 30 * 60 * 1000,
      });

      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        token,
      });
    }

    return NextResponse.json({ success: true, message: safeMessage });
  } catch (error) {
    console.error("[Suno] Forgot password error:", error);
    return NextResponse.json({ success: true, message: safeMessage });
  }
}