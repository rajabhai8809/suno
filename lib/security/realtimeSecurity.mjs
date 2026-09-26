import crypto from "node:crypto";

const MAX_CONNECTIONS_PER_USER = 3;
const MAX_CONNECTIONS_PER_IP = 12;
const CONNECTION_WINDOW_MS = 60_000;
const bucket = new Map();

const TICKET_WINDOW_MS = 60_000;
const TICKET_LIMIT_PER_USER = 30;
const TICKET_LIMIT_PER_IP = 60;
const ticketBuckets = new Map();

function consumeTicketLimit(key, limit, now = Date.now()) {
  const current = ticketBuckets.get(key);
  if (!current || current.expiresAt <= now) {
    ticketBuckets.set(key, { count: 1, expiresAt: now + TICKET_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: Math.ceil(TICKET_WINDOW_MS / 1000) };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)) };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)) };
}

function cleanExpired(now = Date.now()) {
  for (const [key, entry] of bucket.entries()) {
    if (entry.expiresAt <= now && entry.count <= 0) bucket.delete(key);
  }

  if (bucket.size > 5000) {
    const entries = [...bucket.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    for (const [key] of entries.slice(0, Math.ceil(entries.length * 0.2))) {
      bucket.delete(key);
    }
  }
}

function increment(key, limit, now = Date.now()) {
  const current = bucket.get(key);
  if (!current || current.expiresAt <= now) {
    bucket.set(key, { count: 1, expiresAt: now + CONNECTION_WINDOW_MS });
    return true;
  }

  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function decrement(key) {
  const current = bucket.get(key);
  if (!current) return;
  current.count = Math.max(0, current.count - 1);
  if (current.count === 0 && current.expiresAt <= Date.now()) bucket.delete(key);
}

export function isAllowedRealtimeOrigin(origin) {
  if (!origin) return true;

  // Local development and LAN testing should remain easy to use.
  if (process.env.NODE_ENV !== "production") return true;

  const configured = [
    process.env.CORS_ORIGINS,
    process.env.AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
  ]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (!configured.length) return false;

  try {
    const requested = new URL(origin).origin;
    return configured.some((allowed) => {
      try {
        return new URL(allowed).origin === requested;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export function getSocketClientIp(socket) {
  const remote = socket?.handshake?.address || "unknown";

  if (String(process.env.TRUST_PROXY || "").toLowerCase() !== "true") {
    return String(remote);
  }

  const forwarded = socket?.handshake?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim() || String(remote);
  }

  return String(remote);
}

export function acquireRealtimeConnection(userId, ip) {
  const safeUser = String(userId || "");
  const safeIp = String(ip || "unknown");
  const userKey = `user:${safeUser}`;
  const ipKey = `ip:${safeIp}`;
  const now = Date.now();

  cleanExpired(now);

  if (!safeUser || safeUser.length > 128 || safeIp.length > 256) {
    return { allowed: false, release() {} };
  }

  if (!increment(userKey, MAX_CONNECTIONS_PER_USER, now)) {
    return { allowed: false, reason: "USER_CONNECTION_LIMIT" , release() {} };
  }

  if (!increment(ipKey, MAX_CONNECTIONS_PER_IP, now)) {
    decrement(userKey);
    return { allowed: false, reason: "IP_CONNECTION_LIMIT", release() {} };
  }

  let released = false;
  return {
    allowed: true,
    release() {
      if (released) return;
      released = true;
      decrement(userKey);
      decrement(ipKey);
    },
  };
}

export function hashForLog(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 12);
}

export function allowRealtimeTicketRequest(userId, ip) {
  const now = Date.now();
  cleanExpired(now);

  const safeUser = String(userId || "");
  const safeIp = String(ip || "unknown");
  const userResult = consumeTicketLimit(`ticket:user:${safeUser}`, TICKET_LIMIT_PER_USER, now);
  const ipResult = consumeTicketLimit(`ticket:ip:${safeIp}`, TICKET_LIMIT_PER_IP, now);

  if (!userResult.allowed || !ipResult.allowed) {
    return { allowed: false, retryAfterSeconds: Math.max(userResult.retryAfterSeconds, ipResult.retryAfterSeconds) };
  }

  return { allowed: true, retryAfterSeconds: Math.max(userResult.retryAfterSeconds, ipResult.retryAfterSeconds) };
}