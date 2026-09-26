import { consumeRateLimit, isRateLimited } from "@/lib/security/rateLimit";

const CREATE_WINDOW_MS = 60 * 60 * 1000;
const CREATE_LIMIT = 10;
const JOIN_WINDOW_MS = 10 * 60 * 1000;
const JOIN_USER_LIMIT = 20;
const JOIN_IP_LIMIT = 30;

export async function canCreateRoom(userId) {
  const key = `room:create:${userId}`;
  const limited = await isRateLimited(key, CREATE_LIMIT, CREATE_WINDOW_MS);

  if (limited) {
    return { allowed: false, retryAfterSeconds: Math.ceil(CREATE_WINDOW_MS / 1000) };
  }

  const result = await consumeRateLimit(key, CREATE_LIMIT, CREATE_WINDOW_MS);
  return { allowed: result.allowed, retryAfterSeconds: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000) };
}

export async function canJoinRoom(userId, ip) {
  const userKey = `room:join:user:${userId}`;
  const ipKey = `room:join:ip:${ip}`;

  const [userLimited, ipLimited] = await Promise.all([
    isRateLimited(userKey, JOIN_USER_LIMIT, JOIN_WINDOW_MS),
    isRateLimited(ipKey, JOIN_IP_LIMIT, JOIN_WINDOW_MS),
  ]);

  if (userLimited || ipLimited) {
    return { allowed: false, retryAfterSeconds: Math.ceil(JOIN_WINDOW_MS / 1000) };
  }

  const [userResult, ipResult] = await Promise.all([
    consumeRateLimit(userKey, JOIN_USER_LIMIT, JOIN_WINDOW_MS),
    consumeRateLimit(ipKey, JOIN_IP_LIMIT, JOIN_WINDOW_MS),
  ]);

  return {
    allowed: userResult.allowed && ipResult.allowed,
    retryAfterSeconds: Math.ceil((userResult.resetAt.getTime() - Date.now()) / 1000),
  };
}