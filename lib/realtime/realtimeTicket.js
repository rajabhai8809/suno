import crypto from "node:crypto";

const TICKET_TTL_SECONDS = 120;
const VERSION = "srt1";

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is required for realtime tickets.");
  }
  return secret;
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createRealtimeTicket({ userId, roomId }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      v: VERSION,
      uid: String(userId),
      rid: String(roomId),
      iat: now,
      exp: now + TICKET_TTL_SECONDS,
      jti: crypto.randomBytes(12).toString("hex"),
    }),
  );

  return `${payload}.${sign(payload)}`;
}

export function verifyRealtimeTicket(ticket, { userId, roomId } = {}) {
  if (typeof ticket !== "string") {
    throw new Error("Missing realtime ticket.");
  }

  const [payload, signature] = ticket.split(".");
  if (!payload || !signature) {
    throw new Error("Invalid realtime ticket.");
  }

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid realtime ticket signature.");
  }

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid realtime ticket payload.");
  }

  const now = Math.floor(Date.now() / 1000);

  if (data?.v !== VERSION || !data.uid || !data.rid || !data.exp) {
    throw new Error("Invalid realtime ticket claims.");
  }

  if (Number(data.exp) <= now || Number(data.iat) > now + 30) {
    throw new Error("Realtime ticket expired.");
  }

  if (userId && String(data.uid) !== String(userId)) {
    throw new Error("Realtime ticket user mismatch.");
  }

  if (roomId && String(data.rid) !== String(roomId)) {
    throw new Error("Realtime ticket room mismatch.");
  }

  return {
    userId: String(data.uid),
    roomId: String(data.rid),
    issuedAt: Number(data.iat),
    expiresAt: Number(data.exp),
    jti: String(data.jti || ""),
  };
}

export { TICKET_TTL_SECONDS };