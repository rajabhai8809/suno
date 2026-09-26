import { useSyncExternalStore } from "react";

const listeners = new Set();

let state = {
  currentSong: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  volume: 0.9,
  muted: false,
  shuffle: false,
  repeat: "off",
  expanded: false,
  error: "",
  streamExpiresAt: 0,
  audioUnlocked: false,
};

let audio = null;
let audioBound = false;
let requestSerial = 0;
let refreshInFlight = false;
let lastTimePublish = 0;
let previousVolume = 0.9;
let realtimeEmitter = null;
let realtimeSuppressed = 0;
let roomController = null;
let roomRateResetTimer = null;

const EMPTY_SERVER_SNAPSHOT = state;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

function createClientEventId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function emitRealtime(action, payload = {}) {
  if (realtimeSuppressed > 0 || typeof realtimeEmitter !== "function") {
    return;
  }

  try {
    realtimeEmitter(action, payload);
  } catch (error) {
    console.warn("[Suno] Realtime emitter failed:", error);
  }
}

function withRealtimeSuppressed(task) {
  realtimeSuppressed += 1;
  return Promise.resolve()
    .then(task)
    .finally(() => {
      realtimeSuppressed = Math.max(0, realtimeSuppressed - 1);
    });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normaliseSong(song) {
  if (!song?.id) return null;

  return {
    ...song,
    id: String(song.id),
    title: String(song.title || "Untitled song"),
    artist: song.artist ? String(song.artist) : "Unknown artist",
    album: song.album ? String(song.album) : "",
    durationSeconds: Number(song.durationSeconds) || 0,
  };
}

function normaliseQueue(queue) {
  const seen = new Set();
  const result = [];

  for (const item of Array.isArray(queue) ? queue : []) {
    const song = normaliseSong(item?.song || item);
    if (!song || seen.has(song.id)) continue;
    seen.add(song.id);
    result.push(song);
  }

  return result;
}

function publishTime(audioElement) {
  const now = Date.now();
  if (now - lastTimePublish < 180) return;

  lastTimePublish = now;
  const nextTime = Number.isFinite(audioElement.currentTime)
    ? audioElement.currentTime
    : 0;
  const nextDuration = Number.isFinite(audioElement.duration)
    ? audioElement.duration
    : state.duration;

  setState({
    currentTime: nextTime,
    duration: nextDuration > 0 ? nextDuration : state.duration,
  });
}

function resetPlaybackRate() {
  if (roomRateResetTimer) {
    clearTimeout(roomRateResetTimer);
    roomRateResetTimer = null;
  }

  if (audio) {
    try {
      audio.playbackRate = 1;
    } catch {
      // Ignore browsers that do not permit rate changes at this moment.
    }
  }
}

function applySoftDriftCorrection(audioElement, driftSeconds) {
  if (!Number.isFinite(driftSeconds)) return;

  // Ignore tiny clock noise. We only use playbackRate for gentle convergence;
  // actual seeking is reserved for a meaningful divergence.
  if (Math.abs(driftSeconds) < 0.18) {
    resetPlaybackRate();
    return;
  }

  // Keep the correction intentionally subtle so a healthy stream never feels
  // like it is randomly speeding up/slowing down.
  const rate = clamp(1 + driftSeconds * 0.03, 0.985, 1.015);

  try {
    audioElement.playbackRate = rate;
  } catch {
    return;
  }

  if (roomRateResetTimer) clearTimeout(roomRateResetTimer);
  roomRateResetTimer = setTimeout(() => {
    try {
      audioElement.playbackRate = 1;
    } catch {
      // Ignore cleanup failures.
    }
    roomRateResetTimer = null;
  }, 1500);
}

function getAudio() {
  if (typeof window === "undefined") return null;

  if (!audio) {
    audio = new Audio();
    audio.preload = "metadata";
    audio.volume = state.volume;
    audio.muted = state.muted;
  }

  if (!audioBound) {
    audioBound = true;

    audio.addEventListener("loadedmetadata", () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : state.duration;
      setState({
        duration: nextDuration > 0 ? nextDuration : state.duration,
        isLoading: false,
      });
    });

    audio.addEventListener("canplay", () => {
      setState({ isLoading: false });
    });

    audio.addEventListener("playing", () => {
      setState({ isPlaying: true, isLoading: false, error: "" });
    });

    audio.addEventListener("pause", () => {
      resetPlaybackRate();
      setState({ isPlaying: false });
    });

    audio.addEventListener("waiting", () => {
      if (!audio.paused) setState({ isLoading: true });
    });

    audio.addEventListener("stalled", () => {
      if (!audio.paused) setState({ isLoading: true });
    });

    audio.addEventListener("timeupdate", () => {
      publishTime(audio);
      void refreshStreamIfNeeded();
    });

    audio.addEventListener("ended", () => {
      void handleEnded();
    });

    audio.addEventListener("error", () => {
      if (refreshInFlight) return;

      setState({
        isPlaying: false,
        isLoading: false,
        error: "This song could not be played. Try again.",
      });
    });
  }

  return audio;
}

async function fetchStreamUrl(songId) {
  const response = await fetch(`/api/songs/${songId}/stream`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success || !data?.url) {
    throw new Error(data?.message || "Unable to prepare this song for playback.");
  }

  return {
    url: data.url,
    expiresAt: Date.now() + Math.max(60, Number(data.expiresIn) || 900) * 1000,
  };
}

function waitForMetadata(audioElement) {
  if (audioElement.readyState >= 1) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onMetadata = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Unable to load the song audio."));
    };

    const cleanup = () => {
      audioElement.removeEventListener("loadedmetadata", onMetadata);
      audioElement.removeEventListener("error", onError);
    };

    audioElement.addEventListener("loadedmetadata", onMetadata, { once: true });
    audioElement.addEventListener("error", onError, { once: true });
  });
}

async function loadSong(song, { autoplay = true, startAt = 0 } = {}) {
  const nextSong = normaliseSong(song);
  if (!nextSong) return;

  const audioElement = getAudio();
  if (!audioElement) return;

  const serial = ++requestSerial;
  resetPlaybackRate();

  setState({
    currentSong: nextSong,
    isPlaying: false,
    isLoading: true,
    currentTime: Math.max(0, Number(startAt) || 0),
    duration: nextSong.durationSeconds || 0,
    error: "",
  });

  try {
    audioElement.pause();
    audioElement.removeAttribute("src");
    audioElement.load();

    const stream = await fetchStreamUrl(nextSong.id);
    if (serial !== requestSerial) return;

    audioElement.src = stream.url;
    audioElement.load();
    await waitForMetadata(audioElement);
    if (serial !== requestSerial) return;

    const safeStart = clamp(
      Number(startAt) || 0,
      0,
      Math.max(0, audioElement.duration || nextSong.durationSeconds || 0),
    );

    if (safeStart > 0) {
      try {
        audioElement.currentTime = safeStart;
      } catch {
        // Metadata can still be settling in some browsers.
      }
    }

    setState({
      duration:
        Number.isFinite(audioElement.duration) && audioElement.duration > 0
          ? audioElement.duration
          : nextSong.durationSeconds || 0,
      currentTime: safeStart,
      streamExpiresAt: stream.expiresAt,
      isLoading: false,
    });

    if (autoplay) {
      try {
        await audioElement.play();
        setState({ audioUnlocked: true });
      } catch (playError) {
        if (playError?.name === "AbortError") return;
        if (playError?.name === "NotAllowedError") {
          setState({
            error: "Tap play once to allow shared playback on this device.",
            audioUnlocked: false,
          });
          return;
        }
        throw playError;
      }
    }
  } catch (error) {
    if (serial !== requestSerial) return;

    console.error("[Suno] Playback failed:", error);
    setState({
      isPlaying: false,
      isLoading: false,
      error: error?.message || "Unable to play this song.",
    });
  }
}

async function refreshStreamIfNeeded() {
  if (
    !state.currentSong ||
    !state.streamExpiresAt ||
    refreshInFlight ||
    Date.now() < state.streamExpiresAt - 60_000
  ) {
    return;
  }

  const audioElement = getAudio();
  if (!audioElement?.src) return;

  refreshInFlight = true;
  const serialAtStart = requestSerial;
  const previousTime = Number.isFinite(audioElement.currentTime)
    ? audioElement.currentTime
    : state.currentTime;
  const shouldResume = !audioElement.paused;

  try {
    const stream = await fetchStreamUrl(state.currentSong.id);
    if (serialAtStart !== requestSerial) return;

    audioElement.src = stream.url;
    audioElement.load();
    await waitForMetadata(audioElement);
    if (serialAtStart !== requestSerial) return;

    const safeTime = clamp(
      previousTime,
      0,
      Math.max(0, audioElement.duration || state.duration || 0),
    );

    try {
      audioElement.currentTime = safeTime;
    } catch {
      // Ignore browser-specific seek timing.
    }

    setState({
      streamExpiresAt: stream.expiresAt,
      currentTime: safeTime,
      isLoading: false,
      error: "",
    });

    if (shouldResume) {
      await audioElement.play().catch((playError) => {
        if (playError?.name !== "AbortError") throw playError;
      });
    }
  } catch (error) {
    console.warn("[Suno] Stream refresh failed:", error);
  } finally {
    refreshInFlight = false;
  }
}

function predictedRoomPosition(snapshot, serverOffsetMs = 0) {
  // IMPORTANT: snapshot.positionSeconds is already calculated by the server
  // at snapshot.serverNow. Do not add time since playback.changedAt again, or
  // the elapsed time gets counted twice and every reconciliation jumps forward.
  let position = Math.max(0, Number(snapshot?.positionSeconds) || 0);

  if (snapshot?.isPlaying) {
    const serverNow = Number(snapshot?.serverNow);
    if (Number.isFinite(serverNow)) {
      const clientEstimatedServerNow = Date.now() + Number(serverOffsetMs || 0);
      const elapsedSinceSnapshot = Math.max(0, clientEstimatedServerNow - serverNow);
      position += elapsedSinceSnapshot / 1000;
    }
  }

  const duration = Number(snapshot?.song?.durationSeconds) || 0;
  return duration > 0 ? clamp(position, 0, duration) : position;
}

async function reconcileRoomPlayback(snapshot, { serverOffsetMs = 0, hardThreshold = 0.85 } = {}) {
  if (!snapshot || realtimeSuppressed > 0) return;

  await withRealtimeSuppressed(async () => {
    const audioElement = getAudio();
    if (!audioElement) return;

    const song = normaliseSong(snapshot.song);
    const targetPosition = predictedRoomPosition(snapshot, serverOffsetMs);
    const shouldPlay = Boolean(snapshot.isPlaying);

    if (!song) {
      if (state.currentSong || audioElement.src) playerStore.close();
      return;
    }

    if (state.currentSong?.id !== song.id || !audioElement.src) {
      await loadSong(song, { autoplay: false, startAt: targetPosition });
    } else {
      const current = Number(audioElement.currentTime) || 0;
      const drift = targetPosition - current;

      if (Math.abs(drift) > hardThreshold) {
        resetPlaybackRate();
        try {
          audioElement.currentTime = clamp(
            targetPosition,
            0,
            Math.max(0, audioElement.duration || song.durationSeconds || 0),
          );
          setState({ currentTime: audioElement.currentTime });
        } catch {
          // Ignore unsupported timing edge cases.
        }
      } else {
        applySoftDriftCorrection(audioElement, drift);
      }
    }

    const liveAudio = getAudio();
    if (!liveAudio) return;

    if (shouldPlay) {
      if (liveAudio.paused) {
        try {
          await liveAudio.play();
          setState({ audioUnlocked: true, error: "" });
        } catch (error) {
          if (error?.name === "AbortError") return;
          if (error?.name === "NotAllowedError") {
            setState({
              error: "Tap Enable audio to let this room control playback.",
              audioUnlocked: false,
            });
            return;
          }
          setState({ error: "Shared playback is waiting for your audio permission." });
        }
      }
    } else {
      if (!liveAudio.paused) liveAudio.pause();
      resetPlaybackRate();
    }
  });
}

async function handleEnded() {
  const audioElement = getAudio();
  if (!audioElement || !state.currentSong) return;

  if (roomController?.ended) {
    await roomController.ended({ positionSeconds: 0 }).catch(() => {});
    return;
  }

  if (state.repeat === "one") {
    try {
      resetPlaybackRate();
      audioElement.currentTime = 0;
      setState({ currentTime: 0 });
      await audioElement.play();
      emitRealtime("room:seek", {
        positionSeconds: 0,
        clientEventId: createClientEventId(),
      });
      emitRealtime("room:play", {
        songId: state.currentSong.id,
        positionSeconds: 0,
        clientEventId: createClientEventId(),
      });
      return;
    } catch (error) {
      if (error?.name !== "AbortError") console.error("[Suno] Repeat failed:", error);
    }
  }

  const nextIndex = findNextIndex(1);
  if (nextIndex === -1) {
    setState({ isPlaying: false, isLoading: false, currentTime: 0 });
    emitRealtime("room:pause", {
      positionSeconds: 0,
      clientEventId: createClientEventId(),
    });
    return;
  }

  setState({ queueIndex: nextIndex });
  await loadSong(state.queue[nextIndex], { autoplay: true });
  const nextSong = state.queue[nextIndex];
  emitRealtime("room:load", {
    songId: nextSong.id,
    positionSeconds: 0,
    isPlaying: true,
    clientEventId: createClientEventId(),
  });
}

function findNextIndex(direction) {
  const queue = state.queue;
  if (!queue.length || state.queueIndex < 0) return -1;

  if (state.shuffle && queue.length > 1) {
    const choices = queue.map((_, index) => index).filter((index) => index !== state.queueIndex);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  const next = state.queueIndex + direction;
  if (next >= 0 && next < queue.length) return next;
  if (state.repeat === "all") return direction > 0 ? 0 : queue.length - 1;
  return -1;
}

const playerStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot() {
    return state;
  },

  mount() {
    getAudio();
  },

  setRealtimeEmitter(emitter) {
    realtimeEmitter = typeof emitter === "function" ? emitter : null;
  },

  setRoomController(controller) {
    roomController = controller && typeof controller === "object" ? controller : null;
  },

  setRoomQueue(queueItems, currentSongId = null) {
    const queue = normaliseQueue(queueItems);
    const currentId = currentSongId ? String(currentSongId) : state.currentSong?.id;
    const queueIndex = currentId ? queue.findIndex((song) => song.id === currentId) : -1;
    setState({ queue, queueIndex });
  },

  async applyRoomPlayback(snapshot, options) {
    return reconcileRoomPlayback(snapshot, options);
  },

  async reconcileRoomPlayback(snapshot, options) {
    return reconcileRoomPlayback(snapshot, options);
  },

  async unlockAudio() {
    const audioElement = getAudio();
    if (!audioElement) return false;

    try {
      const wasMuted = audioElement.muted;
      const previous = audioElement.volume;
      audioElement.muted = true;
      audioElement.volume = 0;
      await audioElement.play();
      audioElement.pause();
      audioElement.currentTime = clamp(
        state.currentTime,
        0,
        Math.max(0, audioElement.duration || state.duration || 0),
      );
      audioElement.volume = previous;
      audioElement.muted = wasMuted;
      setState({ audioUnlocked: true, error: "" });
      return true;
    } catch {
      setState({ error: "Your browser blocked audio. Tap the play button once." });
      return false;
    }
  },

  async play(song, queue = state.queue) {
    const nextSong = normaliseSong(song);
    if (!nextSong) return;

    if (roomController?.load) {
      return roomController.load(nextSong);
    }

    const normalisedQueue = normaliseQueue(
      normaliseQueue(queue).some((item) => item.id === nextSong.id)
        ? queue
        : [nextSong, ...normaliseQueue(queue)],
    );

    const index = normalisedQueue.findIndex((item) => item.id === nextSong.id);
    setState({ queue: normalisedQueue, queueIndex: index, error: "" });

    const audioElement = getAudio();
    if (state.currentSong?.id === nextSong.id && audioElement?.src) {
      resetPlaybackRate();
      if (audioElement.paused) {
        try {
          await audioElement.play();
          setState({ audioUnlocked: true });
          emitRealtime("room:play", {
            songId: nextSong.id,
            positionSeconds: audioElement.currentTime || state.currentTime,
            clientEventId: createClientEventId(),
          });
        } catch (error) {
          if (error?.name !== "AbortError") setState({ error: "Unable to resume this song." });
        }
      } else {
        const positionSeconds = audioElement.currentTime || state.currentTime;
        audioElement.pause();
        emitRealtime("room:pause", {
          positionSeconds,
          clientEventId: createClientEventId(),
        });
      }
      return;
    }

    await loadSong(nextSong, { autoplay: true });
    if (state.currentSong?.id === nextSong.id && !state.error) {
      emitRealtime("room:load", {
        songId: nextSong.id,
        positionSeconds: audioElement?.currentTime || 0,
        isPlaying: true,
        clientEventId: createClientEventId(),
      });
    }
  },

  async toggle() {
    const audioElement = getAudio();
    if (!audioElement || !state.currentSong) return;

    resetPlaybackRate();

    if (audioElement.paused) {
      try {
        await audioElement.play();
        setState({ audioUnlocked: true });
        emitRealtime("room:play", {
          songId: state.currentSong.id,
          positionSeconds: audioElement.currentTime || state.currentTime,
          clientEventId: createClientEventId(),
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          setState({ error: error?.name === "NotAllowedError" ? "Tap play once to enable audio." : "Unable to resume this song." });
        }
      }
    } else {
      const positionSeconds = audioElement.currentTime || state.currentTime;
      audioElement.pause();
      emitRealtime("room:pause", {
        positionSeconds,
        clientEventId: createClientEventId(),
      });
    }
  },

  pause() {
    const audioElement = getAudio();
    if (!audioElement) return;
    resetPlaybackRate();
    const positionSeconds = audioElement.currentTime || state.currentTime;
    audioElement.pause();
    emitRealtime("room:pause", {
      positionSeconds,
      clientEventId: createClientEventId(),
    });
  },

  async next() {
    if (roomController?.next) {
      return roomController.next({ positionSeconds: state.currentTime });
    }

    const nextIndex = findNextIndex(1);
    if (nextIndex === -1) return;

    setState({ queueIndex: nextIndex });
    await loadSong(state.queue[nextIndex], { autoplay: true });
    emitRealtime("room:load", {
      songId: state.queue[nextIndex].id,
      positionSeconds: 0,
      isPlaying: true,
      clientEventId: createClientEventId(),
    });
  },

  async previous() {
    if (roomController?.previous) {
      return roomController.previous({ positionSeconds: state.currentTime });
    }

    const audioElement = getAudio();
    if (audioElement && state.currentTime > 3) {
      try {
        resetPlaybackRate();
        audioElement.currentTime = 0;
        setState({ currentTime: 0 });
        emitRealtime("room:seek", {
          positionSeconds: 0,
          clientEventId: createClientEventId(),
        });
        return;
      } catch {
        // Fall through to previous track selection.
      }
    }

    const previousIndex = findNextIndex(-1);
    if (previousIndex === -1) return;

    setState({ queueIndex: previousIndex });
    await loadSong(state.queue[previousIndex], { autoplay: true });
    emitRealtime("room:load", {
      songId: state.queue[previousIndex].id,
      positionSeconds: 0,
      isPlaying: true,
      clientEventId: createClientEventId(),
    });
  },

  seek(value) {
    const audioElement = getAudio();
    if (!audioElement) return;

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;

    const max = Number.isFinite(audioElement.duration)
      ? audioElement.duration
      : state.duration || 0;
    const safe = clamp(numeric, 0, Math.max(0, max));

    try {
      resetPlaybackRate();
      audioElement.currentTime = safe;
      setState({ currentTime: safe });
      emitRealtime("room:seek", {
        positionSeconds: safe,
        clientEventId: createClientEventId(),
      });
    } catch {
      // Ignore unsupported seek timing.
    }
  },

  skipSeconds(amount) {
    const audioElement = getAudio();
    if (!audioElement) return;
    const max = Number.isFinite(audioElement.duration) ? audioElement.duration : state.duration || 0;
    this.seek(clamp(state.currentTime + Number(amount || 0), 0, max));
  },

  setVolume(value) {
    const numeric = clamp(Number(value), 0, 1);
    if (!Number.isFinite(numeric)) return;

    const audioElement = getAudio();
    if (audioElement) {
      audioElement.volume = numeric;
      audioElement.muted = false;
    }

    if (numeric > 0) previousVolume = numeric;
    setState({ volume: numeric, muted: false });
  },

  toggleMute() {
    const audioElement = getAudio();
    if (!audioElement) return;

    if (state.muted || audioElement.muted) {
      const nextVolume = previousVolume > 0 ? previousVolume : 0.9;
      audioElement.muted = false;
      audioElement.volume = nextVolume;
      setState({ muted: false, volume: nextVolume });
      return;
    }

    previousVolume = state.volume > 0 ? state.volume : previousVolume;
    audioElement.muted = true;
    setState({ muted: true });
  },

  toggleShuffle() {
    setState({ shuffle: !state.shuffle });
  },

  cycleRepeat() {
    const next = state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
    setState({ repeat: next });
  },

  setExpanded(value) {
    setState({ expanded: Boolean(value) });
  },

  toggleExpanded() {
    setState({ expanded: !state.expanded });
  },

  close() {
    requestSerial += 1;
    const audioElement = getAudio();
    resetPlaybackRate();
    audioElement?.pause();

    if (audioElement) {
      audioElement.removeAttribute("src");
      audioElement.load();
    }

    setState({
      currentSong: null,
      queue: [],
      queueIndex: -1,
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      expanded: false,
      error: "",
      streamExpiresAt: 0,
    });
  },
};

export function useSunoPlayer() {
  return useSyncExternalStore(
    playerStore.subscribe,
    playerStore.getSnapshot,
    () => EMPTY_SERVER_SNAPSHOT,
  );
}

export { playerStore };