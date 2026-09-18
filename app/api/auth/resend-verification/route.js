import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongodb";
import { sendVerificationEmail } from "@/lib/mail";
import { consumeRateLimit } from "@/lib/security/rateLimit";
import { getClientIp, isSameOrigin } from "@/lib/security/request";
import { emailSchema } from "@/lib/security/schemas";
import { issueAuthToken } from "@/lib/tokens";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, message: "Invalid request origin" }, { status: 403 });
  }

  const safeMessage = "If the account is eligible, a verification email will be sent.";

  try {
    const body = await request.json();
    const parsed = emailSchema.safeParse(body?.email);

    if (!parsed.success) {
      return NextResponse.json({ success: true, message: safeMessage });
    }

    const email = parsed.data;

    const ipLimit = await consumeRateLimit(
      `verify-resend:ip:${getClientIp(request)}`,
      5,
      60 * 60 * 1000,
    );

    const emailLimit = await consumeRateLimit(
      `verify-resend:email:${email}`,
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

    if (user && !user.emailVerifiedAt) {
      const { token } = await issueAuthToken({
        userId: user._id,
        purpose: "email_verification",
        expiresInMs: 24 * 60 * 60 * 1000,
      });

      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        token,
      });
    }

    return NextResponse.json({ success: true, message: safeMessage });
  } catch (error) {
    console.error("[Suno] Resend verification error:", error);
    return NextResponse.json({ success: true, message: safeMessage });
  }
}