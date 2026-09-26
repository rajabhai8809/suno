import crypto from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET must be configured before using room codes.");
  }

  return secret;
}

export function generateRoomCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";

  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }

  return code;
}

export function normaliseRoomCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function hashRoomCode(code) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(normaliseRoomCode(code))
    .digest("hex");
}

export function encryptRoomCode(code) {
  const key = crypto.createHash("sha256").update(getSecret()).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(normaliseRoomCode(code), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptRoomCode(ciphertext) {
  const [ivPart, tagPart, dataPart] = String(ciphertext || "").split(".");

  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Invalid room code ciphertext.");
  }

  const key = crypto.createHash("sha256").update(getSecret()).digest();
  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  const encrypted = Buffer.from(dataPart, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function formatRoomCode(code) {
  const normalised = normaliseRoomCode(code);
  return [normalised.slice(0, 4), normalised.slice(4, 8), normalised.slice(8, 10)]
    .filter(Boolean)
    .join("-");
}