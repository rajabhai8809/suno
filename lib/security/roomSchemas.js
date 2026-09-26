import { z } from "zod";

const roomName = z
  .string()
  .trim()
  .min(1, "Room name is required.")
  .max(80, "Room name is too long.");

export const createRoomSchema = z.object({
  name: roomName,
});

export const joinRoomSchema = z.object({
  code: z
    .string()
    .trim()
    .min(8, "Enter your room code.")
    .max(32, "Invalid room code.")
    .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, "")),
});

export const roomIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid room id.");