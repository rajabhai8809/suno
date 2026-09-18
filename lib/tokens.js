import crypto from "node:crypto";
import { connectDB } from "@/lib/db/mongodb";
import AuthToken from "@/models/AuthToken";

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export async function issueAuthToken({ userId, purpose, expiresInMs }) {
  await connectDB();

  await AuthToken.deleteMany({ userId, purpose });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + expiresInMs);

  await AuthToken.create({
    userId,
    purpose,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function consumeAuthToken(token, purpose) {
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) return null;

  await connectDB();

  return AuthToken.findOneAndDelete({
    tokenHash: hashToken(token),
    purpose,
    expiresAt: { $gt: new Date() },
  });
}