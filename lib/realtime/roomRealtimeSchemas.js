import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id.");
const clientEventId = z.string().trim().min(8).max(100);
const positionSeconds = z.number().finite().min(0).max(24 * 60 * 60);
const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional();

export const playbackLoadSchema = z.object({
  clientEventId,
  songId: objectId,
  positionSeconds: positionSeconds.default(0),
  isPlaying: z.boolean().default(true),
  baseRevision: revision,
});

export const playbackPlaySchema = z.object({
  clientEventId,
  songId: objectId.optional(),
  positionSeconds: positionSeconds.optional(),
  baseRevision: revision,
});

export const playbackPauseSchema = z.object({
  clientEventId,
  positionSeconds: positionSeconds.optional(),
  baseRevision: revision,
});

export const playbackSeekSchema = z.object({
  clientEventId,
  positionSeconds,
  baseRevision: revision,
});

export const queueAddSchema = z.object({
  clientEventId,
  songId: objectId,
  baseRevision: revision,
});

export const queueRemoveSchema = z.object({
  clientEventId,
  queueItemId: objectId,
  baseRevision: revision,
});

export const queueReorderSchema = z.object({
  clientEventId,
  queueItemId: objectId,
  toIndex: z.number().int().min(0).max(99),
  baseRevision: revision,
});

export const queueClearSchema = z.object({
  clientEventId,
  baseRevision: revision,
});

export const queueMoveSchema = z.object({
  clientEventId,
  positionSeconds: positionSeconds.optional(),
  baseRevision: revision,
});

export const queueEndedSchema = queueMoveSchema.extend({
  songId: objectId,
  queueItemId: objectId,
});

export const roomSyncSchema = z.object({
  clientSentAt: z.number().finite().optional(),
});