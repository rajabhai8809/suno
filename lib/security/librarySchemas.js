import { z } from "zod";

export const libraryQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(80, "Search query is too long.")
    .optional()
    .default(""),

  artist: z
    .string()
    .trim()
    .max(160, "Artist filter is too long.")
    .optional()
    .default(""),

  duration: z
    .enum(["all", "short", "long"])
    .optional()
    .default("all"),

  sort: z
    .enum(["relevance", "recent", "title", "artist", "duration"])
    .optional()
    .default("recent"),

  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .optional()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(24)
    .optional()
    .default(20),
});