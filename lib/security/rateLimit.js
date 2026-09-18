import { connectDB } from "@/lib/db/mongodb";
import RateLimit from "@/models/RateLimit";

function getWindowStart(windowMs) {
  return Math.floor(Date.now() / windowMs) * windowMs;
}

export async function isRateLimited(key, limit, windowMs) {
  await connectDB();

  const windowStart = getWindowStart(windowMs);
  const entry = await RateLimit.findOne({ key, windowStart }).lean();

  return Boolean(entry && entry.count >= limit);
}

export async function consumeRateLimit(key, limit, windowMs) {
  await connectDB();

  const windowStart = getWindowStart(windowMs);
  const resetAt = new Date(windowStart + windowMs);

  const entry = await RateLimit.findOneAndUpdate(
    { key, windowStart },
    {
      $inc: { count: 1 },
      $setOnInsert: { resetAt },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return {
    allowed: entry.count <= limit,
    count: entry.count,
    remaining: Math.max(0, limit - entry.count),
    resetAt,
  };
}

export async function clearRateLimits(keys) {
  if (!keys?.length) return;

  await connectDB();
  await RateLimit.deleteMany({ key: { $in: keys } });
}