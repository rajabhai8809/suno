import mongoose from "mongoose";
import { Server } from "socket.io";

import { connectDB } from "../lib/db/mongodb.js";
import { roomSocketKey, setRealtimeIO } from "../lib/realtime/realtimeHub.js";
import { verifyRealtimeTicket } from "../lib/realtime/realtimeTicket.js";
import { acquireRealtimeConnection, getSocketClientIp, isAllowedRealtimeOrigin } from "../lib/security/realtimeSecurity.mjs";
import {
  playbackLoadSchema,
  playbackPauseSchema,
  playbackPlaySchema,
  playbackSeekSchema,
  queueAddSchema,
  queueClearSchema,
  queueEndedSchema,
  queueMoveSchema,
  queueRemoveSchema,
  queueReorderSchema,
  roomSyncSchema,
} from "../lib/realtime/roomRealtimeSchemas.js";
import Room from "../models/Room.js";
import Song from "../models/Song.js";

const MAX_QUEUE_ITEMS = 100;
const MAX_ACTIONS_PER_WINDOW = 36;
const ACTION_WINDOW_MS = 1000;
const PRESENCE_REFRESH_MS = 15_000;
const CAS_RETRIES = 5;
const SEEK_DEDUPE_WINDOW_MS = 80;

function roomKey(roomId) {
  return roomSocketKey(roomId);
}
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function objectIdString(value) { return value == null ? null : String(value); }
function isObjectId(value) { return mongoose.Types.ObjectId.isValid(value); }
function serialiseSong(song) {
  if (!song) return null;
  return {
    id: String(song._id || song.id), title: String(song.title || "Untitled song"),
    artist: song.artist ? String(song.artist) : "Unknown artist", album: song.album ? String(song.album) : "",
    durationSeconds: Number(song.durationSeconds) || 0, uploaderId: objectIdString(song.uploaderId),
  };
}
function normaliseQueueItems(room) { return Array.isArray(room?.queue?.items) ? room.queue.items : []; }
function getQueueCurrentItemId(room) { const value = room?.queue?.currentItemId; return value ? String(value) : null; }
function playbackPosition(playback, song, nowMs = Date.now()) {
  let position = Number(playback?.positionSeconds) || 0;
  const changedAt = playback?.changedAt ? new Date(playback.changedAt).getTime() : nowMs;
  if (Boolean(playback?.isPlaying) && Number.isFinite(changedAt)) position += Math.max(0, nowMs - changedAt) / 1000;
  const duration = Number(song?.durationSeconds) || 0;
  return duration > 0 ? clamp(position, 0, duration) : Math.max(0, position);
}
async function getSongsByIds(ids) {
  const validIds = ids.filter((id) => isObjectId(id));
  if (!validIds.length) return new Map();
  const songs = await Song.find({ _id: { $in: validIds }, status: "ready", isActive: true })
    .select("_id title artist album durationSeconds uploaderId").lean();
  return new Map(songs.map((song) => [String(song._id), song]));
}
function serialiseQueue(room, songMap) {
  return normaliseQueueItems(room).map((item) => ({
    id: String(item._id), song: serialiseSong(songMap.get(String(item.songId))), songId: String(item.songId),
    addedBy: objectIdString(item.addedBy), addedAt: item.addedAt, available: Boolean(songMap.get(String(item.songId))),
  }));
}
async function buildSnapshot(room, reason = "update") {
  const queueItems = normaliseQueueItems(room);
  const songIds = queueItems.map((item) => String(item.songId));
  if (room?.playback?.songId) songIds.push(String(room.playback.songId));
  const songMap = await getSongsByIds([...new Set(songIds)]);
  const currentSong = room?.playback?.songId ? songMap.get(String(room.playback.songId)) || null : null;
  const serverNow = Date.now();
  const positionSeconds = playbackPosition(room?.playback, currentSong, serverNow);
  const duration = Number(currentSong?.durationSeconds) || 0;
  const reachedEnd = duration > 0 && positionSeconds >= duration - 0.05;
  return {
    roomId: String(room._id), stateRevision: Number(room?.stateRevision) || 0,
    revision: Number(room?.playback?.revision) || 0, queueRevision: Number(room?.queue?.revision) || 0,
    song: serialiseSong(currentSong), isPlaying: Boolean(room?.playback?.isPlaying) && !reachedEnd,
    positionSeconds: reachedEnd ? duration : positionSeconds,
    changedAt: room?.playback?.changedAt ? new Date(room.playback.changedAt).getTime() : serverNow,
    updatedBy: objectIdString(room?.playback?.updatedBy),
    playback: {
      song: serialiseSong(currentSong), songId: currentSong ? String(currentSong._id) : null,
      queueItemId: objectIdString(room?.playback?.queueItemId),
      isPlaying: Boolean(room?.playback?.isPlaying) && !reachedEnd,
      positionSeconds: reachedEnd ? duration : positionSeconds,
      changedAt: room?.playback?.changedAt ? new Date(room.playback.changedAt).getTime() : serverNow,
      revision: Number(room?.playback?.revision) || 0, updatedBy: objectIdString(room?.playback?.updatedBy),
    },
    queue: { items: serialiseQueue(room, songMap), currentItemId: getQueueCurrentItemId(room), revision: Number(room?.queue?.revision) || 0 },
    serverNow, reason,
  };
}
async function getAuthorisedRoom(roomId, userId) {
  return Room.findOne({ _id: roomId, status: "active", "members.userId": userId })
    .select("_id status playback queue stateRevision members maxMembers creatorId").lean();
}
async function getValidSong(songId) {
  if (!songId || !isObjectId(songId)) return null;
  return Song.findOne({ _id: songId, status: "ready", isActive: true })
    .select("_id title artist album durationSeconds uploaderId").lean();
}
function ackSuccess(ack, data = {}) { if (typeof ack === "function") ack({ ok: true, ...data }); }
function ackError(ack, message, code = "BAD_REQUEST", extra = {}) { if (typeof ack === "function") ack({ ok: false, code, message, ...extra }); }
function alreadyProcessed(socket, eventId) {
  if (!eventId) return false;
  const seen = socket.data.realtimeSeenEvents || new Map(); socket.data.realtimeSeenEvents = seen;
  if (seen.has(eventId)) return true;
  seen.set(eventId, Date.now());
  while (seen.size > 300) seen.delete(seen.keys().next().value);
  return false;
}
function isRateLimited(socket, eventName = "generic") {
  const now = Date.now();
  const bucket = socket.data.actionBucket || { startedAt: now, count: 0, lastSeekAt: 0, lastAction: "" };
  if (now - bucket.startedAt >= ACTION_WINDOW_MS) { bucket.startedAt = now; bucket.count = 0; }
  if (eventName === "seek" && now - bucket.lastSeekAt < SEEK_DEDUPE_WINDOW_MS) return true;
  bucket.count += 1; bucket.lastSeekAt = eventName === "seek" ? now : bucket.lastSeekAt; bucket.lastAction = eventName;
  socket.data.actionBucket = bucket;
  return bucket.count > MAX_ACTIONS_PER_WINDOW;
}
function safeRevision(value) { const revision = Number(value); return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0; }
async function mutateWithCas({ roomId, userId, mutate }) {
  for (let attempt = 0; attempt < CAS_RETRIES; attempt += 1) {
    const room = await getAuthorisedRoom(roomId, userId);
    if (!room) { const error = new Error("The room is closed or your access was removed."); error.code = "ROOM_NOT_ACTIVE"; throw error; }
    const next = await mutate(room);
    if (next.noop) { room.__mutationMeta = next; return room; }
    const filter = {
      _id: roomId, status: "active", "members.userId": userId,
      $and: [{ $or: [{ stateRevision: safeRevision(room.stateRevision) }, ...(safeRevision(room.stateRevision) === 0 ? [{ stateRevision: { $exists: false } }] : [])] }],
    };
    if (next.expectedPlaybackRevision !== undefined) filter.$and.push({ $or: [{ "playback.revision": safeRevision(next.expectedPlaybackRevision) }, ...(safeRevision(next.expectedPlaybackRevision) === 0 ? [{ "playback.revision": { $exists: false } }] : [])] });
    if (next.expectedQueueRevision !== undefined) filter.$and.push({ $or: [{ "queue.revision": safeRevision(next.expectedQueueRevision) }, ...(safeRevision(next.expectedQueueRevision) === 0 ? [{ "queue.revision": { $exists: false } }] : [])] });
    const set = { updatedAt: new Date(), ...(next.$set || {}) };
    const inc = { stateRevision: 1, ...(next.$inc || {}) };
    const updated = await Room.findOneAndUpdate(filter, { $set: set, $inc: inc }, { returnDocument: "after" }).lean();
    if (updated) return updated;
  }
  const error = new Error("The room changed while your action was being processed. Please try again."); error.code = "STATE_CONFLICT"; throw error;
}
function cloneQueue(room) { return normaliseQueueItems(room).map((item) => ({ _id: item._id, songId: item.songId, addedBy: item.addedBy, addedAt: item.addedAt })); }
function findQueueIndex(queue, queueItemId) { return queue.findIndex((item) => String(item._id) === String(queueItemId)); }
function queueCurrentIndex(queue, currentItemId) { return findQueueIndex(queue, currentItemId); }
async function findPlayableFromQueue(queue, startIndex, direction, currentSongId = null) {
  const ids = queue.map((item) => item.songId).filter(Boolean); const songs = await getSongsByIds([...new Set(ids.map(String))]);
  for (let index = startIndex; index >= 0 && index < queue.length; index += direction) {
    const item = queue[index]; const song = songs.get(String(item.songId));
    if (song && String(song._id) !== String(currentSongId || "")) return { index, item, song };
  }
  return null;
}
async function sendSnapshot(io, roomId, room, reason) { const snapshot = await buildSnapshot(room, reason); io.to(roomKey(roomId)).emit("room:state", snapshot); return snapshot; }
async function ensureSongInQueue(room, song, userId) {
  const queue = cloneQueue(room); const existingIndex = queue.findIndex((item) => String(item.songId) === String(song._id));
  if (existingIndex >= 0) return { queue, queueChanged: false, item: queue[existingIndex] };
  if (queue.length >= MAX_QUEUE_ITEMS) { const error = new Error("The room queue is full. Remove a song before adding another."); error.code = "QUEUE_FULL"; throw error; }
  const item = { _id: new mongoose.Types.ObjectId(), songId: song._id, addedBy: new mongoose.Types.ObjectId(userId), addedAt: new Date() }; queue.push(item);
  return { queue, queueChanged: true, item };
}

// The mutation handlers below intentionally remain equivalent to the previously verified
// Phase 7/8 implementation. The production hardening is concentrated in the transport,
// connection admission, payload limits and lifecycle cleanup around these handlers.
async function mutatePlayback({ io, socket, action, payload, ack }) {
  const roomId = String(socket.data.roomId);
  const userId = String(socket.data.userId);

  if (isRateLimited(socket, action)) {
    ackError(ack, "Too many playback commands. Slow down a little.", "RATE_LIMITED");
    return;
  }

  let parsed = null;
  if (action === "load") parsed = playbackLoadSchema.safeParse(payload);
  if (action === "play") parsed = playbackPlaySchema.safeParse(payload);
  if (action === "pause") parsed = playbackPauseSchema.safeParse(payload);
  if (action === "seek") parsed = playbackSeekSchema.safeParse(payload);

  if (!parsed?.success) {
    ackError(ack, "Invalid playback command.");
    return;
  }

  if (alreadyProcessed(socket, parsed.data.clientEventId)) {
    ackSuccess(ack, { duplicate: true, eventId: parsed.data.clientEventId });
    return;
  }

  await connectDB();

  let updated;
  try {
    updated = await mutateWithCas({
      roomId,
      userId,
      mutate: async (room) => {
        const now = new Date();
        const nowMs = now.getTime();
        const currentSong = room.playback?.songId
          ? await getValidSong(room.playback.songId)
          : null;

        let song = currentSong;
        let nextSongId = room.playback?.songId || null;
        let nextQueueItemId = room.playback?.queueItemId || null;
        let nextPosition = playbackPosition(room.playback, currentSong, nowMs);
        let nextIsPlaying = Boolean(room.playback?.isPlaying);
        let queue = cloneQueue(room);
        let queueChanged = false;

        if (action === "load") {
          song = await getValidSong(parsed.data.songId);
          if (!song) {
            const error = new Error("That song is unavailable.");
            error.code = "SONG_UNAVAILABLE";
            throw error;
          }

          const ensured = await ensureSongInQueue(room, song, userId);
          queue = ensured.queue;
          queueChanged = ensured.queueChanged || String(nextQueueItemId || "") !== String(ensured.item._id);
          nextQueueItemId = ensured.item._id;
          nextSongId = song._id;
          nextPosition = clamp(
            parsed.data.positionSeconds,
            0,
            Math.max(0, Number(song.durationSeconds) || 0),
          );
          nextIsPlaying = Boolean(parsed.data.isPlaying);
        }

        if (action === "play") {
          if (parsed.data.songId) {
            song = await getValidSong(parsed.data.songId);
            if (!song) {
              const error = new Error("That song is unavailable.");
              error.code = "SONG_UNAVAILABLE";
              throw error;
            }

            const ensured = await ensureSongInQueue(room, song, userId);
            queue = ensured.queue;
            queueChanged = ensured.queueChanged || String(nextQueueItemId || "") !== String(ensured.item._id);
            nextQueueItemId = ensured.item._id;
            nextSongId = song._id;
            nextPosition = parsed.data.positionSeconds == null
              ? 0
              : clamp(parsed.data.positionSeconds, 0, Math.max(0, Number(song.durationSeconds) || 0));
          } else if (nextSongId) {
            song = await getValidSong(nextSongId);
          }

          if (!song) {
            const error = new Error("Choose a song before pressing play.");
            error.code = "NO_SONG";
            throw error;
          }

          nextIsPlaying = true;
        }

        if (action === "pause") {
          nextPosition = playbackPosition(room.playback, currentSong, nowMs);
          if (parsed.data.positionSeconds != null) {
            nextPosition = parsed.data.positionSeconds;
          }
          if (currentSong) {
            nextPosition = clamp(nextPosition, 0, Math.max(0, Number(currentSong.durationSeconds) || 0));
          }
          nextIsPlaying = false;
        }

        if (action === "seek") {
          if (!nextSongId) {
            const error = new Error("Choose a song before seeking.");
            error.code = "NO_SONG";
            throw error;
          }

          nextPosition = parsed.data.positionSeconds;
          if (currentSong) {
            nextPosition = clamp(nextPosition, 0, Math.max(0, Number(currentSong.durationSeconds) || 0));
          }
        }

        if (song && !nextQueueItemId) {
          const ensured = await ensureSongInQueue(room, song, userId);
          queue = ensured.queue;
          queueChanged = true;
          nextQueueItemId = ensured.item._id;
        }

        if (queueChanged) {
          const currentIndex = queueCurrentIndex(queue, nextQueueItemId);
          const nextQueueCurrentItemId = currentIndex >= 0 ? queue[currentIndex]._id : null;

          return {
            expectedPlaybackRevision: safeRevision(room.playback?.revision),
            expectedQueueRevision: safeRevision(room.queue?.revision),
            $set: {
              "queue.items": queue,
              "queue.currentItemId": nextQueueCurrentItemId,
              "playback.songId": nextSongId,
              "playback.queueItemId": nextQueueCurrentItemId,
              "playback.isPlaying": nextIsPlaying,
              "playback.positionSeconds": nextPosition,
              "playback.changedAt": now,
              "playback.updatedBy": userId,
            },
            $inc: {
              "queue.revision": 1,
              "playback.revision": 1,
            },
          };
        }

        return {
          expectedPlaybackRevision: safeRevision(room.playback?.revision),
          $set: {
            "playback.songId": nextSongId,
            "playback.queueItemId": nextQueueItemId,
            "playback.isPlaying": nextIsPlaying,
            "playback.positionSeconds": nextPosition,
            "playback.changedAt": now,
            "playback.updatedBy": userId,
          },
          $inc: {
            "playback.revision": 1,
          },
        };
      },
    });
  } catch (error) {
    ackError(
      ack,
      error?.message || "Unable to update shared playback.",
      error?.code || "SERVER_ERROR",
    );
    return;
  }

  const snapshot = await sendSnapshot(io, roomId, updated, action);

  ackSuccess(ack, {
    revision: snapshot.revision,
    stateRevision: snapshot.stateRevision,
    queueRevision: snapshot.queueRevision,
    eventId: parsed.data.clientEventId,
  });

  await Room.updateOne(
    { _id: roomId, "members.userId": userId },
    { $set: { "members.$.lastSeenAt": new Date() } },
  ).catch(() => { });
}

async function mutateQueue({ io, socket, action, payload, ack }) {
  const roomId = String(socket.data.roomId);
  const userId = String(socket.data.userId);

  if (isRateLimited(socket, `queue:${action}`)) {
    ackError(ack, "Too many queue actions. Slow down a little.", "RATE_LIMITED");
    return;
  }

  const schema = {
    add: queueAddSchema,
    remove: queueRemoveSchema,
    reorder: queueReorderSchema,
    clear: queueClearSchema,
    next: queueMoveSchema,
    previous: queueMoveSchema,
    ended: queueEndedSchema,
  }[action];

  const parsed = schema?.safeParse(payload);
  if (!parsed?.success) {
    ackError(ack, "Invalid queue command.");
    return;
  }

  if (alreadyProcessed(socket, parsed.data.clientEventId)) {
    ackSuccess(ack, { duplicate: true, eventId: parsed.data.clientEventId });
    return;
  }

  await connectDB();

  let updated;
  try {
    updated = await mutateWithCas({
      roomId,
      userId,
      mutate: async (room) => {
        let queue = cloneQueue(room);
        const queueRevision = safeRevision(room.queue?.revision);
        const playbackRevision = safeRevision(room.playback?.revision);
        const now = new Date();
        let nextQueue = queue;
        let nextCurrentItemId = room.queue?.currentItemId || null;
        let queueChanged = false;
        let playbackChanged = false;
        let nextSongId = room.playback?.songId || null;
        let nextQueueItemId = room.playback?.queueItemId || null;
        let nextIsPlaying = Boolean(room.playback?.isPlaying);
        let nextPosition = Number(room.playback?.positionSeconds) || 0;

        // Migrate legacy rooms that have playback but no current queue item yet.
        if (nextSongId && !nextCurrentItemId) {
          const playableCurrent = await getValidSong(nextSongId);
          if (playableCurrent) {
            const migratedItem = {
              _id: new mongoose.Types.ObjectId(),
              songId: playableCurrent._id,
              addedBy: new mongoose.Types.ObjectId(userId),
              addedAt: now,
            };
            nextQueue = [migratedItem, ...queue];
            queue = nextQueue;
            nextCurrentItemId = migratedItem._id;
            nextQueueItemId = migratedItem._id;
            queueChanged = true;
          }
        }

        if (action === "add") {
          const song = await getValidSong(parsed.data.songId);
          if (!song) {
            const error = new Error("That song is unavailable.");
            error.code = "SONG_UNAVAILABLE";
            throw error;
          }

          const duplicate = queue.find((item) => String(item.songId) === String(song._id));
          if (duplicate) {
            return {
              noop: true,
              duplicate: true,
            };
          }

          if (queue.length >= MAX_QUEUE_ITEMS) {
            const error = new Error("The room queue is full. Remove a song before adding another.");
            error.code = "QUEUE_FULL";
            throw error;
          }

          queue.push({
            _id: new mongoose.Types.ObjectId(),
            songId: song._id,
            addedBy: new mongoose.Types.ObjectId(userId),
            addedAt: now,
          });
          nextQueue = queue;
          queueChanged = true;

          if (!nextCurrentItemId) {
            nextCurrentItemId = queue[0]._id;
            nextQueueItemId = queue[0]._id;
            nextSongId = queue[0].songId;
            nextPosition = 0;
            playbackChanged = true;
          }
        }

        if (action === "remove") {
          const removeIndex = findQueueIndex(queue, parsed.data.queueItemId);
          if (removeIndex < 0) {
            const error = new Error("That queue item is no longer available.");
            error.code = "QUEUE_ITEM_NOT_FOUND";
            throw error;
          }

          const removingCurrent = String(queue[removeIndex]._id) === String(nextCurrentItemId || "");
          nextQueue = queue.filter((_, index) => index !== removeIndex);
          queueChanged = true;

          if (removingCurrent) {
            let candidateIndex = Math.min(removeIndex, nextQueue.length - 1);
            let candidate = null;

            if (nextQueue.length > 0) {
              candidate = await findPlayableFromQueue(
                nextQueue,
                candidateIndex,
                1,
                nextSongId,
              );

              if (!candidate && candidateIndex > 0) {
                candidate = await findPlayableFromQueue(
                  nextQueue,
                  candidateIndex - 1,
                  -1,
                  nextSongId,
                );
              }
            }

            if (candidate) {
              nextCurrentItemId = candidate.item._id;
              nextQueueItemId = candidate.item._id;
              nextSongId = candidate.song._id;
              nextPosition = 0;
              playbackChanged = true;
            } else {
              nextCurrentItemId = null;
              nextQueueItemId = null;
              nextSongId = null;
              nextPosition = 0;
              nextIsPlaying = false;
              playbackChanged = true;
            }
          }
        }

        if (action === "reorder") {
          const fromIndex = findQueueIndex(queue, parsed.data.queueItemId);
          if (fromIndex < 0) {
            const error = new Error("That queue item is no longer available.");
            error.code = "QUEUE_ITEM_NOT_FOUND";
            throw error;
          }

          const toIndex = clamp(parsed.data.toIndex, 0, queue.length - 1);
          if (fromIndex !== toIndex) {
            const [moved] = queue.splice(fromIndex, 1);
            queue.splice(toIndex, 0, moved);
            nextQueue = queue;
            queueChanged = true;
          }
        }

        if (action === "clear") {
          const currentIndex = queueCurrentIndex(queue, nextCurrentItemId);
          nextQueue = currentIndex >= 0 ? [queue[currentIndex]] : [];
          queueChanged = nextQueue.length !== queue.length;
          nextCurrentItemId = currentIndex >= 0 ? queue[currentIndex]._id : null;
          // Clearing the queue removes only upcoming items. The current song keeps playing.
        }

        if (action === "ended") {
          const expectedSongId = String(parsed.data.songId);
          const expectedQueueItemId = String(parsed.data.queueItemId);
          const actualSongId = String(room.playback?.songId || "");
          const actualQueueItemId = String(room.playback?.queueItemId || room.queue?.currentItemId || "");

          if (expectedSongId !== actualSongId || expectedQueueItemId !== actualQueueItemId || !room.playback?.isPlaying) {
            return { noop: true, staleEnd: true };
          }
        }

        if (action === "next" || action === "previous" || action === "ended") {
          const currentIndex = queueCurrentIndex(queue, nextCurrentItemId);
          const direction = action === "previous" ? -1 : 1;
          const shouldSeekToStart = action === "previous" && Number(parsed.data.positionSeconds || 0) > 3;

          if (shouldSeekToStart) {
            nextPosition = 0;
            nextIsPlaying = false;
            nextIsPlaying = Boolean(room.playback?.isPlaying);
            playbackChanged = true;
          } else {
            const startIndex = currentIndex < 0 ? (direction > 0 ? 0 : queue.length - 1) : currentIndex + direction;
            const candidate = await findPlayableFromQueue(queue, startIndex, direction, null);

            if (!candidate) {
              if (action === "ended") {
                nextPosition = 0;
                nextIsPlaying = false;
                playbackChanged = true;
              } else {
                const error = new Error(
                  direction > 0 ? "There is no next song in the queue." : "There is no previous song in the queue.",
                );
                error.code = direction > 0 ? "NO_NEXT" : "NO_PREVIOUS";
                throw error;
              }
            } else {
              nextCurrentItemId = candidate.item._id;
              nextQueueItemId = candidate.item._id;
              nextSongId = candidate.song._id;
              nextPosition = 0;
              nextIsPlaying = action === "ended" ? true : Boolean(room.playback?.isPlaying || true);
              queueChanged = String(nextCurrentItemId || "") !== String(room.queue?.currentItemId || "");
              playbackChanged = true;
            }
          }
        }

        const set = {
          ...(queueChanged
            ? {
              "queue.items": nextQueue,
              "queue.currentItemId": nextCurrentItemId,
            }
            : {}),
          ...(playbackChanged
            ? {
              "playback.songId": nextSongId,
              "playback.queueItemId": nextQueueItemId,
              "playback.isPlaying": nextIsPlaying,
              "playback.positionSeconds": nextPosition,
              "playback.changedAt": now,
              "playback.updatedBy": userId,
            }
            : {}),
        };

        if (!queueChanged && !playbackChanged) {
          return { noop: true };
        }

        const inc = {
          ...(queueChanged ? { "queue.revision": 1 } : {}),
          ...(playbackChanged ? { "playback.revision": 1 } : {}),
        };

        return {
          expectedQueueRevision: queueRevision,
          ...(playbackChanged ? { expectedPlaybackRevision: playbackRevision } : {}),
          $set: set,
          $inc: inc,
          duplicate: false,
        };
      },
    });
  } catch (error) {
    ackError(
      ack,
      error?.message || "Unable to update the shared queue.",
      error?.code || "SERVER_ERROR",
    );
    return;
  }

  const snapshot = await sendSnapshot(io, roomId, updated, action === "ended" ? "ended" : `queue:${action}`);

  ackSuccess(ack, {
    stateRevision: snapshot.stateRevision,
    revision: snapshot.revision,
    queueRevision: snapshot.queueRevision,
    eventId: parsed.data.clientEventId,
    duplicate: Boolean(updated?.__mutationMeta?.duplicate),
    staleEnd: Boolean(updated?.__mutationMeta?.staleEnd),
  });

  await Room.updateOne(
    { _id: roomId, "members.userId": userId },
    { $set: { "members.$.lastSeenAt": new Date() } },
  ).catch(() => { });
}


export function createRealtimeServer(httpServer) {
  const io = new Server(httpServer, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 64 * 1024,
    pingInterval: 20_000,
    pingTimeout: 20_000,
    connectTimeout: 10_000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
    allowRequest(req, callback) {
      const origin = req.headers?.origin;
      callback(null, isAllowedRealtimeOrigin(origin));
    },
  });

  setRealtimeIO(io);

  io.use(async (socket, next) => {
    let connection = null;
    try {
      const ticket = socket.handshake.auth?.ticket;
      const roomId = socket.handshake.auth?.roomId;
      const claims = verifyRealtimeTicket(ticket, { roomId });
      await connectDB();
      const room = await getAuthorisedRoom(claims.roomId, claims.userId);
      if (!room) {
        const error = new Error("Room access denied.");
        error.data = { code: "ROOM_ACCESS_DENIED" };
        return next(error);
      }

      const ip = getSocketClientIp(socket);
      connection = acquireRealtimeConnection(claims.userId, ip);
      if (!connection.allowed) {
        const error = new Error("Too many active realtime connections. Close another Suno tab and try again.");
        error.data = { code: connection.reason || "CONNECTION_LIMIT" };
        return next(error);
      }

      socket.data.userId = claims.userId;
      socket.data.roomId = claims.roomId;
      socket.data.clientIp = ip;
      socket.data.connectionRelease = connection.release;
      socket.data.connectedAt = Date.now();
      socket.data.realtimeSeenEvents = new Map();
      socket.data.actionBucket = { startedAt: Date.now(), count: 0, lastSeekAt: 0, lastAction: "" };
      return next();
    } catch (error) {
      connection?.release?.();
      const authError = new Error(error?.message || "Realtime authentication failed.");
      authError.data = { code: "REALTIME_AUTH_FAILED" };
      return next(authError);
    }
  });

  io.on("connection", async (socket) => {
    const roomId = String(socket.data.roomId);
    const userId = String(socket.data.userId);
    const channel = roomKey(roomId);
    socket.join(channel);

    await Room.updateOne({ _id: roomId, "members.userId": userId }, { $set: { "members.$.lastSeenAt": new Date() } }).catch(() => { });
    const room = await getAuthorisedRoom(roomId, userId);
    if (room) socket.emit("room:state", await buildSnapshot(room, "connected"));
    socket.to(channel).emit("room:presence", { roomId, userId, type: "joined" });

    const presenceTimer = setInterval(async () => {
      if (!socket.connected) return;
      await Room.updateOne({ _id: roomId, "members.userId": userId }, { $set: { "members.$.lastSeenAt": new Date() } }).catch(() => { });
    }, PRESENCE_REFRESH_MS);

    socket.on("room:sync", async (payload, ack) => {
      try {
        const parsed = roomSyncSchema.safeParse(payload || {});
        const clientSentAt = parsed.success ? parsed.data.clientSentAt : undefined;
        await connectDB();
        const authorised = await getAuthorisedRoom(roomId, userId);
        if (!authorised) {
          ackError(ack, "You no longer have access to this room.", "ROOM_ACCESS_REVOKED");
          socket.emit("room:access-revoked", { roomId }); socket.disconnect(true); return;
        }
        const snapshot = await buildSnapshot(authorised, "sync");
        const serverNow = Date.now();
        socket.emit("room:state", { ...snapshot, serverNow });
        ackSuccess(ack, { serverNow, clientSentAt: Number.isFinite(clientSentAt) ? clientSentAt : undefined, stateRevision: snapshot.stateRevision, revision: snapshot.revision, queueRevision: snapshot.queueRevision });
      } catch (error) { ackError(ack, error?.message || "Unable to sync room.", "SERVER_ERROR"); }
    });

    const wrap = (action, message) => (payload, ack) => {
      void (action === "load" || action === "play" || action === "pause" || action === "seek"
        ? mutatePlayback({ io, socket, action, payload, ack })
        : mutateQueue({ io, socket, action, payload, ack })
      ).catch((error) => {
        console.error(`[Suno] room:${action} failed:`, error);
        ackError(ack, message, "SERVER_ERROR");
      });
    };

    socket.on("room:load", wrap("load", "Unable to change the shared song."));
    socket.on("room:play", wrap("play", "Unable to start shared playback."));
    socket.on("room:pause", wrap("pause", "Unable to pause shared playback."));
    socket.on("room:seek", wrap("seek", "Unable to seek shared playback."));
    socket.on("room:queue-add", wrap("add", "Unable to add that song to the queue."));
    socket.on("room:queue-remove", wrap("remove", "Unable to remove that queue item."));
    socket.on("room:queue-reorder", wrap("reorder", "Unable to reorder the queue."));
    socket.on("room:queue-clear", wrap("clear", "Unable to clear the queue."));
    socket.on("room:next", wrap("next", "Unable to move to the next song."));
    socket.on("room:previous", wrap("previous", "Unable to move to the previous song."));
    socket.on("room:ended", wrap("ended", "Unable to advance the queue."));

    socket.on("disconnect", async (reason) => {
      clearInterval(presenceTimer);
      socket.data.connectionRelease?.();
      socket.data.connectionRelease = null;
      await Room.updateOne({ _id: roomId, "members.userId": userId }, { $set: { "members.$.lastSeenAt": new Date() } }).catch(() => { });
      io.to(channel).emit("room:presence", { roomId, userId, type: "left", reason });
    });
  });

  return io;
}

export default createRealtimeServer;