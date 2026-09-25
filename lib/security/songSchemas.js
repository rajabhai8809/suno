import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(160)
  .optional()
  .or(z.literal(""));

export const initiateSongUploadSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1, "A file name is required.")
    .max(255, "File name is too long."),

  fileSize: z
    .number()
    .int()
    .positive("File is empty."),

  mimeType: z
    .string()
    .trim()
    .max(100),

  title: optionalText,
  artist: optionalText,
  album: optionalText,
});

export const completeSongUploadSchema = z.object({
  uploadId: z
    .string()
    .regex(/^[a-f0-9]{24}$/i, "Invalid upload id."),
});

export const cancelSongUploadSchema = completeSongUploadSchema;