import { z } from "zod";

const text = (max, fallback = "") =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .default(fallback);

export const libraryQuerySchema = z.object({
  q: text(80),
  artist: text(160),
  genre: text(80),
  language: text(80),
  duration: z.enum(["all", "short", "long"]).optional().default("all"),
  sort: z
    .enum(["relevance", "recent", "title", "artist", "duration"])
    .optional()
    .default("recent"),
  scope: z.enum(["all", "mine"]).optional().default("all"),
  page: z.coerce.number().int().min(1).max(100000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(48).optional().default(40),
});