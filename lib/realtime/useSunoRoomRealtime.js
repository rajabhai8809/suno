"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import { playerStore } from "@/lib/player/sunoPlayerStore";

function roomErrorMessage(error) {
  return error?.message || "Realtime connection failed.";
}

function makeClientEventId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readQueueSnapshot(snapshot) {
  return Array.isArray(snapshot?.queue?.items) ? snapshot.queue.items : [];
}

export function useSunoRoomRealtime(roomId, enabled = true, seedEmpty = false) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [presenceVersion, setPresenceVersion] = useState(0);
  const [closed, setClosed] = useState(false);

  const latestStateRevisionRef = useRef(-1);
  const latestPlaybackRevisionRef = useRef(-1);
  const latestQueueRevisionRef = useRef(-1);
  const serverOffsetRef = useRef(0);
  const socketRef = useRef(null);
  const commandRef = useRef(null);
  const seededEmptyRoomRef = useRef(false);
  const seekTimerRef = useRef(null);
  const pendingSeekRef = useRef(null);
  const clockReadyRef = useRef(false);

  const loadSharedSong = useCallback(async (song, options = {}) => {
    const songId = song?.id ? String(song.id) : "";
    if (!songId) throw new Error("Please choose a valid song.");

    if (typeof commandRef.current !== "function") {
      throw new Error("The room is still connecting. Please wait a moment and try again.");
    }

    return commandRef.current("room:load", {
      clientEventId: makeClientEventId(),
      songId,
      positionSeconds: Math.max(0, Number(options.positionSeconds) || 0),
      isPlaying: options.isPlaying !== false,
      baseRevision:
        latestPlaybackRevisionRef.current >= 0
          ? latestPlaybackRevisionRef.current
          : undefined,
    });
  }, []);

  const addToQueue = useCallback(async (song) => {
    const songId = song?.id ? String(song.id) : "";
    if (!songId) throw new Error("Please choose a valid song.");
    if (typeof commandRef.current !== "function") {
      throw new Error("The room is still connecting. Please wait a moment and try again.");
    }

    return commandRef.current("room:queue-add", {
      clientEventId: makeClientEventId(),
      songId,
      baseRevision:
        latestQueueRevisionRef.current >= 0
          ? latestQueueRevisionRef.current
          : undefined,
    });
  }, []);

  const removeFromQueue = useCallback(async (queueItemId) => {
    if (!queueItemId) throw new Error("Invalid queue item.");
    return commandRef.current?.("room:queue-remove", {
      clientEventId: makeClientEventId(),
      queueItemId: String(queueItemId),
      baseRevision:
        latestQueueRevisionRef.current >= 0
          ? latestQueueRevisionRef.current
          : undefined,
    });
  }, []);

  const reorderQueue = useCallback(async (queueItemId, toIndex) => {
    if (!queueItemId) throw new Error("Invalid queue item.");
    return commandRef.current?.("room:queue-reorder", {
      clientEventId: makeClientEventId(),
      queueItemId: String(queueItemId),
      toIndex: Math.max(0, Math.min(99, Math.floor(Number(toIndex) || 0))),
      baseRevision:
        latestQueueRevisionRef.current >= 0
          ? latestQueueRevisionRef.current
          : undefined,
    });
  }, []);

  const clearQueue = useCallback(async () => {
    if (typeof commandRef.current !== "function") {
      throw new Error("The room is still connecting. Please wait a moment and try again.");
    }

    return commandRef.current("room:queue-clear", {
      clientEventId: makeClientEventId(),
      baseRevision:
        latestQueueRevisionRef.current >= 0
          ? latestQueueRevisionRef.current
          : undefined,
    });
  }, []);

  const playQueueItem = useCallback(async (songId) => {
    return loadSharedSong({ id: songId }, { positionSeconds: 0, isPlaying: true });
  }, [loadSharedSong]);

  const next = useCallback(async () => {
    if (typeof commandRef.current !== "function") {
      throw new Error("The room is still connecting. Please wait a moment and try again.");
    }

    return commandRef.current("room:next", {
      clientEventId: makeClientEventId(),
      positionSeconds: playerStore.getSnapshot().currentTime,
      baseRevision:
        latestQueueRevisionRef.current >= 0
          ? latestQueueRevisionRef.current
          : undefined,
    });
  }, []);

  const previous = useCallback(async () => {
    if (typeof commandRef.current !== "function") {
      throw new Error("The room is still connecting. Please wait a moment and try again.");
    }

    return commandRef.current("room:previous", {
      clientEventId: makeClientEventId(),
      positionSeconds: playerStore.getSnapshot().currentTime,
      baseRevision:
        latestQueueRevisionRef.current >= 0
          ? latestQueueRevisionRef.current
          : undefined,
    });
  }, []);

  const unlockAudio = useCallback(() => playerStore.unlockAudio(), []);

  useEffect(() => {
    if (!enabled || !roomId) {
      setStatus("idle");
      setError("");
      setSnapshot(null);
      setClosed(false);
      latestStateRevisionRef.current = -1;
      latestPlaybackRevisionRef.current = -1;
      latestQueueRevisionRef.current = -1;
      clockReadyRef.current = false;
      seededEmptyRoomRef.current = false;
      commandRef.current = null;
      playerStore.setRealtimeEmitter(null);
      playerStore.setRoomController(null);
      return undefined;
    }

    let disposed = false;
    let socket = null;
    let localDriftTimer = null;
    let serverSyncTimer = null;
    const snapshotRef = { current: null };

    async function getTicket() {
      const response = await fetch(
        `/api/realtime/ticket?roomId=${encodeURIComponent(roomId)}`,
        {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      );

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || !data.ticket) {
        throw new Error(data?.message || "Unable to authorize realtime room access.");
      }

      return data.ticket;
    }

    function updateClockFromSnapshot(nextSnapshot) {
      if (!Number.isFinite(Number(nextSnapshot?.serverNow))) return;
      const measuredOffset = Number(nextSnapshot.serverNow) - Date.now();
      if (!clockReadyRef.current) {
        serverOffsetRef.current = measuredOffset;
        clockReadyRef.current = true;
        return;
      }
      serverOffsetRef.current = serverOffsetRef.current * 0.92 + measuredOffset * 0.08;
    }

    function handleSyncAck(result, sentAt, receivedAt) {
      if (!result?.ok) {
        if (result?.message) setError(result.message);
        return;
      }

      const serverNow = Number(result.serverNow);
      if (Number.isFinite(serverNow)) {
        const midpoint = sentAt + Math.max(0, receivedAt - sentAt) / 2;
        const measuredOffset = serverNow - midpoint;
        serverOffsetRef.current = serverOffsetRef.current * 0.35 + measuredOffset * 0.65;
        clockReadyRef.current = true;
      }
    }

    async function start() {
      setStatus("connecting");
      setError("");
      setClosed(false);
      latestStateRevisionRef.current = -1;
      latestPlaybackRevisionRef.current = -1;
      latestQueueRevisionRef.current = -1;
      clockReadyRef.current = false;
      seededEmptyRoomRef.current = false;
      commandRef.current = null;

      try {
        let activeTicket = await getTicket();
        if (disposed) return;

        socket = io(window.location.origin, {
          path: "/socket.io",
          transports: ["websocket", "polling"],
          auth: async (callback) => {
            try {
              activeTicket = await getTicket();
            } catch {
              // Reuse the most recent ticket when a reconnect races the ticket endpoint.
            }
            callback({ ticket: activeTicket, roomId: String(roomId) });
          },
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 700,
          reconnectionDelayMax: 5000,
          timeout: 10_000,
          autoConnect: true,
        });

        socketRef.current = socket;

        const emitCommand = (action, payload = {}, timeoutMs = 8000) => {
          if (!socket?.connected) {
            return Promise.reject(new Error("Realtime room is not connected."));
          }

          return new Promise((resolve, reject) => {
            const timer = window.setTimeout(() => {
              reject(new Error("The room did not respond in time. Please try again."));
            }, timeoutMs);

            socket.timeout(timeoutMs).emit(action, payload, (transportError, result) => {
              window.clearTimeout(timer);

              if (transportError) {
                reject(new Error("The room did not respond in time. Please try again."));
                return;
              }

              if (!result?.ok) {
                const nextError = new Error(result?.message || "Unable to update the room.");
                nextError.code = result?.code;
                reject(nextError);
                return;
              }

              resolve(result);
            });
          });
        };

        commandRef.current = emitCommand;

        const emitSeekDebounced = (payload) => {
          pendingSeekRef.current = payload;
          if (seekTimerRef.current) return;

          seekTimerRef.current = window.setTimeout(() => {
            seekTimerRef.current = null;
            const nextPayload = pendingSeekRef.current;
            pendingSeekRef.current = null;
            if (!nextPayload || !socket?.connected) return;

            socket.emit("room:seek", {
              ...nextPayload,
              clientEventId: makeClientEventId(),
              baseRevision:
                latestPlaybackRevisionRef.current >= 0
                  ? latestPlaybackRevisionRef.current
                  : undefined,
            });
          }, 120);
        };

        const emitPlayerAction = (action, payload = {}) => {
          if (!socket?.connected) return;

          if (action === "room:seek") {
            emitSeekDebounced(payload);
            return;
          }

          const commandPayload = {
            ...payload,
            clientEventId: payload.clientEventId || makeClientEventId(),
            baseRevision:
              latestPlaybackRevisionRef.current >= 0
                ? latestPlaybackRevisionRef.current
                : undefined,
          };

          void emitCommand(action, commandPayload).catch((commandError) => {
            if (!disposed) setError(commandError?.message || "Unable to sync that control change.");
          });
        };

        playerStore.setRealtimeEmitter(emitPlayerAction);
        playerStore.setRoomController({
          load: (song) => loadSharedSong(song, { positionSeconds: 0, isPlaying: true }),
          next: () => next(),
          previous: () => previous(),
          ended: (payload = {}) => {
            const player = playerStore.getSnapshot();
            return commandRef.current?.("room:ended", {
              clientEventId: makeClientEventId(),
              songId: player.currentSong?.id,
              queueItemId: snapshotRef.current?.queue?.currentItemId,
              positionSeconds: Math.max(0, Number(payload.positionSeconds) || 0),
              baseRevision:
                latestQueueRevisionRef.current >= 0
                  ? latestQueueRevisionRef.current
                  : undefined,
            });
          },
        });

        socket.on("connect", () => {
          if (disposed) return;
          setStatus("connected");
          setError("");

          const clientSentAt = Date.now();
          socket.emit("room:sync", { clientSentAt }, (result) => {
            handleSyncAck(result, clientSentAt, Date.now());
          });
        });

        socket.on("disconnect", (reason) => {
          if (disposed) return;
          if (reason === "io client disconnect") {
            setStatus("idle");
            return;
          }
          setStatus("disconnected");
          setError("Realtime connection interrupted. Reconnecting…");
        });

        socket.on("connect_error", (connectError) => {
          if (disposed) return;
          setStatus("error");
          setError(roomErrorMessage(connectError));
        });

        socket.on("room:state", (nextSnapshot) => {
          if (disposed || !nextSnapshot) return;

          snapshotRef.current = nextSnapshot;
          updateClockFromSnapshot(nextSnapshot);

          const stateRevision = Number(nextSnapshot.stateRevision) || 0;
          const playbackRevision = Number(nextSnapshot.playback?.revision ?? nextSnapshot.revision) || 0;
          const queueRevision = Number(nextSnapshot.queue?.revision ?? nextSnapshot.queueRevision) || 0;
          const isSync = nextSnapshot.reason === "sync";

          if (stateRevision < latestStateRevisionRef.current) return;
          if (stateRevision === latestStateRevisionRef.current && !isSync) return;

          const playbackChanged = playbackRevision > latestPlaybackRevisionRef.current || isSync;
          const queueChanged = queueRevision > latestQueueRevisionRef.current || isSync;

          latestStateRevisionRef.current = Math.max(latestStateRevisionRef.current, stateRevision);
          latestPlaybackRevisionRef.current = Math.max(latestPlaybackRevisionRef.current, playbackRevision);
          latestQueueRevisionRef.current = Math.max(latestQueueRevisionRef.current, queueRevision);

          setSnapshot(nextSnapshot);

          if (queueChanged) {
            playerStore.setRoomQueue(readQueueSnapshot(nextSnapshot), nextSnapshot?.song?.id || nextSnapshot?.playback?.song?.id || null);
          }

          const emptyRoomCanBeSeeded =
            seedEmpty &&
            nextSnapshot.reason === "connected" &&
            !nextSnapshot.song &&
            stateRevision === 0 &&
            !seededEmptyRoomRef.current &&
            socket?.connected;

          if (emptyRoomCanBeSeeded) {
            const localPlayer = playerStore.getSnapshot();
            const localSong = localPlayer.currentSong;
            if (localSong?.id) {
              seededEmptyRoomRef.current = true;
              socket.emit("room:load", {
                clientEventId: makeClientEventId(),
                songId: localSong.id,
                positionSeconds: Number(localPlayer.currentTime) || 0,
                isPlaying: Boolean(localPlayer.isPlaying),
                baseRevision: playbackRevision,
              });
              return;
            }
          }

          if (playbackChanged) {
            void playerStore.applyRoomPlayback(nextSnapshot, {
              serverOffsetMs: serverOffsetRef.current,
              hardThreshold: isSync ? 0.75 : 0.85,
            });
          }
        });

        socket.on("room:presence", () => {
          setPresenceVersion((value) => value + 1);
        });

        socket.on("room:closed", () => {
          setClosed(true);
          setStatus("closed");
          setError("The room was closed by its creator.");
          playerStore.setRealtimeEmitter(null);
          playerStore.setRoomController(null);
          playerStore.close();
        });

        socket.on("room:access-revoked", () => {
          setClosed(true);
          setStatus("revoked");
          setError("You no longer have access to this room.");
          playerStore.setRealtimeEmitter(null);
          playerStore.setRoomController(null);
          playerStore.close();
        });

        socket.on("room:error", (payload) => {
          if (payload?.message) setError(payload.message);
        });

        localDriftTimer = window.setInterval(() => {
          if (!socket?.connected || disposed || !snapshotRef.current) return;
          void playerStore.reconcileRoomPlayback(snapshotRef.current, {
            serverOffsetMs: serverOffsetRef.current,
            hardThreshold: 0.85,
          });
        }, 1400);

        serverSyncTimer = window.setInterval(() => {
          if (!socket?.connected || disposed) return;
          const clientSentAt = Date.now();
          socket.emit("room:sync", { clientSentAt }, (result) => {
            handleSyncAck(result, clientSentAt, Date.now());
          });
        }, 4500);

        socket.emit("room:sync", { clientSentAt: Date.now() }, (result) => {
          handleSyncAck(result, Date.now(), Date.now());
        });
      } catch (startError) {
        if (!disposed) {
          setStatus("error");
          setError(roomErrorMessage(startError));
        }
      }
    }

    void start();

    return () => {
      disposed = true;
      commandRef.current = null;
      playerStore.setRealtimeEmitter(null);
      playerStore.setRoomController(null);

      if (seekTimerRef.current) {
        window.clearTimeout(seekTimerRef.current);
        seekTimerRef.current = null;
      }
      pendingSeekRef.current = null;

      if (localDriftTimer) {
        window.clearInterval(localDriftTimer);
        localDriftTimer = null;
      }
      if (serverSyncTimer) {
        window.clearInterval(serverSyncTimer);
        serverSyncTimer = null;
      }

      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }

      socketRef.current = null;
      socket = null;
    };
  }, [enabled, roomId, seedEmpty, loadSharedSong, next, previous]);

  return {
    status,
    error,
    snapshot,
    presenceVersion,
    closed,
    serverOffsetMs: serverOffsetRef.current,
    loadSharedSong,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    playQueueItem,
    next,
    previous,
    unlockAudio,
  };
}