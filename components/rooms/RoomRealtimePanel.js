"use client";

import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  CloudOff,
  Headphones,
  ListPlus,
  Loader2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipBack,
  SkipForward,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { playerStore, useSunoPlayer } from "@/lib/player/sunoPlayerStore";

function formatDuration(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function statusCopy(status) {
  switch (status) {
    case "connected":
      return "Live sync connected";
    case "connecting":
      return "Connecting to room…";
    case "disconnected":
      return "Reconnecting…";
    case "closed":
      return "Room closed";
    case "revoked":
      return "Access removed";
    case "error":
      return "Sync unavailable";
    default:
      return "Shared playback";
  }
}

function statusTone(status) {
  if (status === "connected") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (status === "connecting") return "border-amber-400/20 bg-amber-400/10 text-amber-100";
  if (status === "closed" || status === "revoked") return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  return "border-white/10 bg-white/[0.04] text-white/60";
}

function ActionButton({ label, onClick, children, disabled = false, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? "border-violet-300/20 bg-white text-black hover:bg-white/90"
          : "border-white/10 bg-white/[0.04] text-white/75 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function RoomRealtimePanel({ realtime }) {
  const player = useSunoPlayer();
  const [queueBusyId, setQueueBusyId] = useState("");
  const [queueMessage, setQueueMessage] = useState("");
  const [audioBusy, setAudioBusy] = useState(false);

  const snapshot = realtime?.snapshot;
  const song = snapshot?.song || snapshot?.playback?.song || null;
  const isPlaying = Boolean(snapshot?.isPlaying ?? snapshot?.playback?.isPlaying);
  const queue = snapshot?.queue?.items || [];
  const currentItemId = String(snapshot?.queue?.currentItemId || "");
  const revision = Number(snapshot?.stateRevision) || 0;
  const currentTime = Number(player.currentTime) || Number(snapshot?.positionSeconds) || 0;
  const duration = Number(player.duration) || Number(song?.durationSeconds) || 0;

  const isCurrentAudioBlocked = Boolean(
    player.error?.toLowerCase().includes("tap") ||
    player.error?.toLowerCase().includes("enable audio"),
  );

  const playableQueue = useMemo(
    () => queue.filter((item) => item?.available !== false && item?.song),
    [queue],
  );

  useEffect(() => {
    if (realtime?.snapshot) {
      setQueueMessage("");
    }
  }, [realtime?.snapshot]);

  async function runQueueAction(itemId, action) {
    setQueueBusyId(`${action}:${itemId}`);
    setQueueMessage("");

    try {
      await action(itemId);
    } catch (error) {
      setQueueMessage(error?.message || "Unable to update the queue.");
    } finally {
      setQueueBusyId("");
    }
  }

  async function clearQueue() {
    if (queue.length <= 1) return;
    if (!window.confirm("Clear the upcoming queue for everyone? The current song will keep playing.")) return;

    setQueueBusyId("clear");
    setQueueMessage("");

    try {
      await realtime.clearQueue();
    } catch (error) {
      setQueueMessage(error?.message || "Unable to clear the queue.");
    } finally {
      setQueueBusyId("");
    }
  }

  async function enableAudio() {
    setAudioBusy(true);
    await realtime.unlockAudio();
    setAudioBusy(false);
  }

  async function playQueueSong(item) {
    if (!item?.song?.id) return;

    setQueueBusyId(`play:${item.id}`);
    setQueueMessage("");

    try {
      await realtime.playQueueItem(item.song.id);
    } catch (error) {
      setQueueMessage(error?.message || "Unable to play this song for the room.");
    } finally {
      setQueueBusyId("");
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative border-b border-white/8 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusTone(realtime?.status)}`}>
                {realtime?.status === "connecting" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : realtime?.status === "connected" ? (
                  <Wifi size={12} />
                ) : realtime?.status === "disconnected" || realtime?.status === "error" ? (
                  <WifiOff size={12} />
                ) : realtime?.status === "closed" || realtime?.status === "revoked" ? (
                  <CloudOff size={12} />
                ) : (
                  <RotateCcw size={12} />
                )}
                {statusCopy(realtime?.status)}
              </span>

              {realtime?.status === "connected" ? (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/45">
                  state v{revision}
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-violet-300/15 bg-gradient-to-br from-violet-400/15 via-fuchsia-400/10 to-cyan-300/10 text-violet-200 shadow-[0_12px_36px_rgba(124,58,237,0.12)]">
                <Headphones size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">Shared player</p>
                <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {song?.title || "Nothing is playing yet"}
                </h2>
                <p className="mt-1 truncate text-sm text-white/50">
                  {song
                    ? `${song.artist || "Unknown artist"} · ${formatDuration(currentTime)} / ${formatDuration(duration)}`
                    : "Choose a song from the shared library for everyone."}
                </p>
              </div>
            </div>
          </div>

          {isCurrentAudioBlocked ? (
            <button
              type="button"
              onClick={() => void enableAudio()}
              disabled={audioBusy}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/10 px-3.5 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-300/15 disabled:opacity-50"
            >
              {audioBusy ? <Loader2 size={15} className="animate-spin" /> : <Headphones size={15} />}
              {audioBusy ? "Enabling…" : "Enable audio"}
            </button>
          ) : null}
        </div>

        {song ? (
          <div className="mt-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-200 transition-[width] duration-150"
                style={{ width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-medium text-white/35">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-center gap-2">
          <ActionButton
            label="Previous song"
            onClick={() => void realtime.previous().catch((error) => setQueueMessage(error?.message || "No previous song."))}
            disabled={realtime?.status !== "connected" || !playableQueue.length}
          >
            <SkipBack size={16} />
          </ActionButton>

          <ActionButton
            label={isPlaying ? "Pause shared playback" : "Play shared playback"}
            primary
            onClick={() => void playerStore.toggle()}
            disabled={realtime?.status !== "connected" || !song}
          >
            {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
          </ActionButton>

          <ActionButton
            label="Next song"
            onClick={() => void realtime.next().catch((error) => setQueueMessage(error?.message || "No next song."))}
            disabled={realtime?.status !== "connected" || !playableQueue.length}
          >
            <SkipForward size={16} />
          </ActionButton>
        </div>

        {realtime?.error || player.error ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-300/15 bg-rose-300/[0.06] px-3 py-2.5 text-xs leading-5 text-rose-100/80">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{realtime?.error || player.error}</span>
          </div>
        ) : null}
      </div>

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">Shared queue</p>
            <div className="mt-1 flex items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight text-white">Up next</h3>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/45">
                {queue.length}/100
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.assign(`/library?roomId=${encodeURIComponent(snapshot?.roomId || "")}&mode=queue`);
              }}
              disabled={realtime?.status !== "connected"}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
            >
              <ListPlus size={14} />
              Add from library
            </button>

            <button
              type="button"
              onClick={() => void clearQueue()}
              disabled={queue.length <= 1 || queueBusyId === "clear" || realtime?.status !== "connected"}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/55 transition hover:border-rose-300/20 hover:bg-rose-300/[0.05] hover:text-rose-100 disabled:opacity-30"
            >
              {queueBusyId === "clear" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Clear up next
            </button>
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 py-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-white/45">
              <Plus size={17} />
            </div>
            <p className="mt-3 text-sm font-medium text-white/75">Your shared queue is empty.</p>
            <p className="mt-1 text-xs leading-5 text-white/40">Add songs from the library. Everyone in the room can control the queue.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/8 bg-black/10">
            {queue.map((item, index) => {
              const itemSong = item.song;
              const current = String(item.id) === currentItemId;
              const unavailable = item.available === false || !itemSong;
              const busy = queueBusyId.endsWith(`:${item.id}`);

              return (
                <div
                  key={item.id}
                  className={`group flex items-center gap-3 px-3 py-3 transition ${current ? "bg-violet-400/[0.07]" : "hover:bg-white/[0.025]"}`}
                >
                  <div className="flex w-5 shrink-0 justify-center text-[11px] font-medium text-white/25">{index + 1}</div>

                  <button
                    type="button"
                    onClick={() => void playQueueSong(item)}
                    disabled={unavailable || busy || realtime?.status !== "connected"}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] text-white/55">
                      {current && isPlaying ? <span className="flex items-end gap-0.5"><i className="h-2 w-0.5 animate-pulse rounded-full bg-violet-200" /><i className="h-3.5 w-0.5 animate-pulse rounded-full bg-violet-200 [animation-delay:120ms]" /><i className="h-2.5 w-0.5 animate-pulse rounded-full bg-violet-200 [animation-delay:220ms]" /></span> : <Headphones size={14} />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white/85">
                        {itemSong?.title || "Unavailable song"}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-white/40">
                        {unavailable ? "No longer available" : itemSong.artist || "Unknown artist"}
                      </span>
                    </span>

                    {current ? (
                      <span className="hidden shrink-0 rounded-full border border-violet-300/15 bg-violet-300/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-violet-100/80 sm:inline-flex">
                        Playing
                      </span>
                    ) : null}
                  </button>

                  <div className="flex shrink-0 items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => void runQueueAction(item.id, (id) => realtime.reorderQueue(id, index - 1))}
                      disabled={index === 0 || queueBusyId !== "" || realtime?.status !== "connected"}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 text-white/35 transition hover:bg-white/[0.06] hover:text-white/75 disabled:opacity-20"
                      title="Move up"
                      aria-label={`Move ${itemSong?.title || "song"} up`}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void runQueueAction(item.id, (id) => realtime.reorderQueue(id, index + 1))}
                      disabled={index === queue.length - 1 || queueBusyId !== "" || realtime?.status !== "connected"}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 text-white/35 transition hover:bg-white/[0.06] hover:text-white/75 disabled:opacity-20"
                      title="Move down"
                      aria-label={`Move ${itemSong?.title || "song"} down`}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void runQueueAction(item.id, realtime.removeFromQueue)}
                      disabled={queueBusyId !== "" || realtime?.status !== "connected"}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 text-white/35 transition hover:border-rose-300/15 hover:bg-rose-300/[0.05] hover:text-rose-100 disabled:opacity-20"
                      title="Remove from queue"
                      aria-label={`Remove ${itemSong?.title || "song"}`}
                    >
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {queueMessage ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2.5 text-xs text-amber-100/75">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{queueMessage}</span>
          </div>
        ) : null}

        <div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-white/35">
          <Check size={13} className="mt-0.5 shrink-0 text-emerald-300/60" />
          Queue changes and playback changes are committed by the room server, so all devices converge on the same state.
        </div>
      </div>
    </section>
  );
}