"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  ListMusic,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Shuffle,
  Volume1,
  Volume2,
  VolumeX,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect } from "react";

import { playerStore, useSunoPlayer } from "@/lib/player/sunoPlayerStore";

const ART = [
  "from-violet-500 via-fuchsia-500 to-indigo-700",
  "from-cyan-400 via-blue-500 to-violet-700",
  "from-orange-300 via-rose-500 to-fuchsia-700",
  "from-emerald-300 via-teal-500 to-cyan-700",
  "from-pink-400 via-fuchsia-500 to-purple-700",
  "from-indigo-400 via-violet-500 to-fuchsia-600",
];

function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value)) return "0:00";

  const total = Math.max(0, Math.floor(value));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function getArtIndex(song) {
  const value = String(song?.id || song?.title || "suno");
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash % ART.length;
}

function Artwork({ song, large = false }) {
  const index = getArtIndex(song);
  const letter = song?.title?.trim()?.charAt(0)?.toUpperCase() || "♪";

  return (
    <div
      className={`relative isolate shrink-0 overflow-hidden bg-gradient-to-br ${ART[index]} ${
        large
          ? "h-[min(78vw,21rem)] w-[min(78vw,21rem)] max-w-full rounded-[2rem] sm:h-[22rem] sm:w-[22rem] lg:h-[25rem] lg:w-[25rem] lg:rounded-[2.25rem]"
          : "h-11 w-11 rounded-xl sm:h-12 sm:w-12 sm:rounded-[0.9rem]"
      }`}
      aria-hidden="true"
    >
      <span
        className={`absolute inset-0 flex items-center justify-center font-semibold text-white/95 ${
          large ? "text-[4.2rem] sm:text-[5rem] lg:text-[5.5rem]" : "text-base"
        }`}
      >
        {letter}
      </span>
      <span className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <span className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-black/10 blur-2xl" />
      <span className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/[0.05]" />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  active = false,
  disabled = false,
  className = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={[
        "grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-white/40 transition-all duration-200",
        "active:scale-95 disabled:cursor-not-allowed disabled:opacity-25",
        active
          ? "border-violet-300/20 bg-violet-300/10 text-violet-200"
          : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function RangeInput({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
  disabled,
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      disabled={disabled}
      className="h-1.5 w-full min-w-0 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

export default function SunoGlobalPlayer() {
  const player = useSunoPlayer();
  const {
    currentSong,
    queue,
    queueIndex,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    expanded,
    error,
  } = player;

  useEffect(() => {
    playerStore.mount();
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();

      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        void playerStore.toggle();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        playerStore.skipSeconds(-10);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        playerStore.skipSeconds(10);
      }

      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        playerStore.toggleMute();
      }

      if (event.key === "Escape" && expanded) {
        event.preventDefault();
        playerStore.setExpanded(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  if (!currentSong) return null;

  const totalDuration = duration || Number(currentSong.durationSeconds) || 0;
  const progress = totalDuration
    ? Math.min(currentTime, totalDuration)
    : 0;
  const queueCount = queue.length;
  const hasPrevious =
    queueCount > 1 &&
    (queueIndex > 0 || repeat === "all" || shuffle);
  const hasNext =
    queueCount > 1 &&
    (queueIndex < queueCount - 1 || repeat === "all" || shuffle);

  return (
    <>
      {!expanded ? (
        <div className="fixed inset-x-2 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-[70] sm:inset-x-4 sm:bottom-4 lg:bottom-4">
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#09090d]/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-3 sm:p-2.5 lg:grid-cols-[minmax(0,1.2fr)_auto_minmax(15rem,0.9fr)_auto]">
            <button
              type="button"
              onClick={() => playerStore.setExpanded(true)}
              className="flex min-w-0 items-center gap-3 rounded-xl px-1 text-left"
              aria-label={`Open player for ${currentSong.title}`}
            >
              <Artwork song={currentSong} />
              <span className="min-w-0">
                <strong className="block truncate text-xs font-semibold text-white/90 sm:text-sm">
                  {currentSong.title}
                </strong>
                <small className="mt-0.5 block truncate text-[10px] text-white/35 sm:text-[11px]">
                  {currentSong.artist}
                </small>
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-1.5">
              <IconButton
                label="Previous track"
                onClick={() => void playerStore.previous()}
                disabled={!hasPrevious}
                className="hidden sm:grid"
              >
                <ChevronLeft size={16} />
              </IconButton>

              <button
                type="button"
                onClick={() => void playerStore.toggle()}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black shadow-lg shadow-white/10 transition active:scale-95 sm:h-11 sm:w-11"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
              </button>

              <IconButton
                label="Next track"
                onClick={() => void playerStore.next()}
                disabled={!hasNext}
              >
                <ChevronRight size={16} />
              </IconButton>
            </div>

            <div className="hidden min-w-0 items-center gap-2 lg:flex">
              <span className="w-9 shrink-0 text-right text-[9px] tabular-nums text-white/25">
                {formatDuration(progress)}
              </span>
              <RangeInput
                min="0"
                max={totalDuration || 0}
                step="0.1"
                value={progress}
                onChange={(event) => playerStore.seek(event.target.value)}
                ariaLabel="Playback position"
                disabled={!totalDuration}
              />
              <span className="w-9 shrink-0 text-[9px] tabular-nums text-white/25">
                {formatDuration(totalDuration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <IconButton
                label="Open full player"
                onClick={() => playerStore.setExpanded(true)}
                className="hidden sm:grid"
              >
                <Maximize2 size={15} />
              </IconButton>
              <IconButton
                label={muted ? "Unmute" : "Mute"}
                onClick={() => playerStore.toggleMute()}
              >
                {muted || volume === 0 ? (
                  <VolumeX size={15} />
                ) : (
                  <Volume2 size={15} />
                )}
              </IconButton>
            </div>
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className="fixed inset-0 z-[120] overflow-hidden bg-[#050507] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(139,92,246,.12),transparent_30%),radial-gradient(circle_at_90%_88%,rgba(236,72,153,.07),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,.015),transparent_20%,transparent_80%,rgba(255,255,255,.01))]" />

          <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-3 sm:h-[4.5rem] sm:px-6">
              <IconButton
                label="Minimize player"
                onClick={() => playerStore.setExpanded(false)}
              >
                <ChevronDown size={18} />
              </IconButton>

              <div className="min-w-0 px-3 text-center">
                <p className="text-[8px] font-semibold uppercase tracking-[0.28em] text-white/25 sm:text-[9px]">
                  Now playing
                </p>
                <p className="mt-1 truncate text-[10px] text-white/45 sm:text-xs">
                  Suno shared library
                </p>
              </div>

              <IconButton
                label="Close player"
                onClick={() => playerStore.close()}
              >
                <X size={17} />
              </IconButton>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-10 lg:pt-10">
                <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:items-center lg:gap-12 xl:grid-cols-[34rem_minmax(0,1fr)] xl:gap-16">
                  <div className="flex min-w-0 flex-col items-center">
                    <div className="relative flex w-full items-center justify-center">
                      <div className="absolute h-[min(84vw,23rem)] w-[min(84vw,23rem)] rounded-full bg-violet-400/[0.055] blur-3xl sm:h-[25rem] sm:w-[25rem] lg:h-[29rem] lg:w-[29rem]" />
                      <div className="relative rounded-[2rem] bg-white/[0.03] p-1.5 shadow-[0_25px_90px_rgba(0,0,0,.35)] ring-1 ring-white/[0.07] sm:p-2">
                        <Artwork song={currentSong} large />
                      </div>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/25">
                      <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? "animate-pulse bg-emerald-300" : "bg-white/25"}`} />
                      {isPlaying ? "Playing" : "Paused"}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-violet-300/10 bg-violet-300/[0.06] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.17em] text-violet-200/75">
                        From Suno library
                      </span>
                      {currentSong.album ? (
                        <span className="max-w-full truncate rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[8px] text-white/25">
                          {currentSong.album}
                        </span>
                      ) : null}
                    </div>

                    <h1
                      title={currentSong.title}
                      className="break-words text-2xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-3xl lg:text-4xl xl:text-5xl"
                    >
                      {currentSong.title}
                    </h1>
                    <p className="mt-2 truncate text-sm text-white/40 sm:text-base">
                      {currentSong.artist}
                    </p>

                    <div className="mt-7 min-w-0">
                      <RangeInput
                        min="0"
                        max={totalDuration || 0}
                        step="0.1"
                        value={progress}
                        onChange={(event) => playerStore.seek(event.target.value)}
                        ariaLabel="Playback position"
                        disabled={!totalDuration}
                      />
                      <div className="mt-2 flex items-center justify-between text-[10px] tabular-nums text-white/25">
                        <span>{formatDuration(progress)}</span>
                        <span>{formatDuration(totalDuration)}</span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2 sm:justify-start sm:gap-3">
                      <IconButton
                        label="Shuffle"
                        active={shuffle}
                        onClick={() => playerStore.toggleShuffle()}
                      >
                        <Shuffle size={16} />
                      </IconButton>

                      <IconButton
                        label="Previous track"
                        onClick={() => void playerStore.previous()}
                        disabled={!hasPrevious}
                        className="h-11 w-11"
                      >
                        <RotateCcw size={18} />
                      </IconButton>

                      <button
                        type="button"
                        onClick={() => void playerStore.toggle()}
                        aria-label={isPlaying ? "Pause" : "Play"}
                        className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-black shadow-xl shadow-black/30 transition active:scale-95 sm:h-16 sm:w-16"
                      >
                        {isLoading ? (
                          <Loader2 size={21} className="animate-spin" />
                        ) : isPlaying ? (
                          <Pause size={22} fill="currentColor" />
                        ) : (
                          <Play size={22} fill="currentColor" />
                        )}
                      </button>

                      <IconButton
                        label="Next track"
                        onClick={() => void playerStore.next()}
                        disabled={!hasNext}
                        className="h-11 w-11"
                      >
                        <RotateCw size={18} />
                      </IconButton>

                      <IconButton
                        label={`Repeat ${repeat === "off" ? "off" : repeat === "one" ? "one track" : "all tracks"}`}
                        active={repeat !== "off"}
                        onClick={() => playerStore.cycleRepeat()}
                      >
                        {repeat === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
                      </IconButton>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        disabled
                        className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 text-xs font-medium text-white/35 disabled:cursor-not-allowed"
                      >
                        <Heart size={15} />
                        Favorite
                      </button>

                      <Link
                        href="/rooms"
                        onClick={() => playerStore.setExpanded(false)}
                        className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border border-violet-300/15 bg-violet-300/[0.06] px-4 text-xs font-semibold text-violet-100/85 transition hover:bg-violet-300/[0.1]"
                      >
                        <UsersRound size={15} />
                        Listen together
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          const queue = document.getElementById("suno-player-queue");
                          queue?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 text-xs font-medium text-white/45 transition hover:bg-white/[0.045] hover:text-white"
                      >
                        <ListMusic size={15} />
                        Queue {queueCount}
                      </button>
                    </div>

                    <div className="mt-5 flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.018] px-3.5 py-3">
                      <button
                        type="button"
                        onClick={() => playerStore.toggleMute()}
                        aria-label={muted ? "Unmute" : "Mute"}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/40 transition hover:bg-white/[0.05] hover:text-white"
                      >
                        {muted || volume === 0 ? (
                          <VolumeX size={16} />
                        ) : volume < 0.5 ? (
                          <Volume1 size={16} />
                        ) : (
                          <Volume2 size={16} />
                        )}
                      </button>

                      <RangeInput
                        min="0"
                        max="1"
                        step="0.01"
                        value={muted ? 0 : volume}
                        onChange={(event) => playerStore.setVolume(event.target.value)}
                        ariaLabel="Volume"
                      />

                      <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-white/25">
                        {Math.round((muted ? 0 : volume) * 100)}%
                      </span>
                    </div>

                    {error ? (
                      <p className="mt-3 break-words rounded-2xl border border-red-300/10 bg-red-300/[0.05] px-3.5 py-3 text-xs leading-5 text-red-200/75">
                        {error}
                      </p>
                    ) : null}
                  </div>
                </div>

                <section
                  id="suno-player-queue"
                  className="mt-10 min-w-0 border-t border-white/[0.06] pt-6 sm:mt-12 sm:pt-8"
                >
                  <div className="flex min-w-0 items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/20">
                        Up next
                      </p>
                      <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-[-0.03em] sm:text-xl">
                        <ListMusic size={16} /> Queue
                      </h2>
                    </div>
                    <span className="shrink-0 text-[10px] tabular-nums text-white/25">
                      {queueCount} {queueCount === 1 ? "song" : "songs"}
                    </span>
                  </div>

                  <div className="mt-4 grid min-w-0 gap-1.5">
                    {queue.map((song, index) => {
                      const active = String(song.id) === String(currentSong.id);

                      return (
                        <button
                          key={`${song.id}-${index}`}
                          type="button"
                          onClick={() => {
                            void playerStore.play(song, queue);
                          }}
                          className={`grid w-full min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-2 py-2 text-left transition sm:grid-cols-[1.8rem_minmax(0,2fr)_auto_auto] sm:px-3 ${
                            active
                              ? "border border-violet-300/12 bg-violet-300/[0.045]"
                              : "border border-transparent hover:bg-white/[0.03]"
                          }`}
                        >
                          <span className="text-center text-[10px] tabular-nums text-white/20">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <span className="flex min-w-0 items-center gap-3">
                            <Artwork song={song} />
                            <span className="min-w-0">
                              <strong className="block truncate text-xs font-medium text-white/80 sm:text-sm">
                                {song.title}
                              </strong>
                              <small className="mt-0.5 block truncate text-[10px] text-white/30 sm:text-[11px]">
                                {song.artist}
                              </small>
                            </span>
                          </span>

                          <span className="hidden shrink-0 text-[10px] tabular-nums text-white/20 sm:block">
                            {formatDuration(song.durationSeconds)}
                          </span>

                          {active ? (
                            <span className="shrink-0 rounded-full bg-violet-300/10 px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] text-violet-200/80">
                              {isPlaying ? "Playing" : "Current"}
                            </span>
                          ) : (
                            <Play className="hidden h-3.5 w-3.5 shrink-0 text-white/25 sm:block" fill="currentColor" />
                          )}
                        </button>
                      );
                    })}

                    {queueCount === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-xs text-white/25">
                        Nothing is queued yet.
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}