import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongodb";
import { sendVerificationEmail } from "@/lib/mail";
import { hashPassword } from "@/lib/security/password";
import { consumeRateLimit } from "@/lib/security/rateLimit";
import { getClientIp, isSameOrigin } from "@/lib/security/request";
import { registerSchema } from "@/lib/security/schemas";
import { issueAuthToken } from "@/lib/tokens";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, message: "Invalid request origin" }, { status: 403 });
  }

  const rate = await consumeRateLimit(
    `register:ip:${getClientIp(request)}`,
    5,
    60 * 60 * 1000,
  );

  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, message: "Too many registration attempts. Try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || "Invalid registration details",
        },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    await connectDB();

    const emailRate = await consumeRateLimit(
      `register:email:${email}`,
      3,
      60 * 60 * 1000,
    );

    if (!emailRate.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many registration attempts. Try again later." },
        { status: 429 },
      );
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with these details already exists.",
        },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      passwordHash,
      authProvider: "credentials",
      emailVerifiedAt: null,
    });

    const { token } = await issueAuthToken({
      userId: user._id,
      purpose: "email_verification",
      expiresInMs: 24 * 60 * 60 * 1000,
    });

    try {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        token,
      });
    } catch (mailError) {
      console.error("[Suno] Verification email failed:", mailError);

      return NextResponse.json(
        {
          success: false,
          message: "Account created, but the verification email could not be sent. Please use resend verification.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account created. Check your email to verify your account.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Unable to create this account." },
        { status: 409 },
      );
    }

    console.error("[Suno] Registration error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create your account right now." },
      { status: 500 },
    );
  }
}