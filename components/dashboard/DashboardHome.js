"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Headphones,
  LibraryBig,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  UploadCloud,
  UsersRound,
} from "lucide-react";
import { playerStore, useSunoPlayer } from "@/lib/player/sunoPlayerStore";

function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return "--:--";
  const minutes = Math.floor(value / 60);
  const secondsPart = Math.floor(value % 60);
  return `${minutes}:${String(secondsPart).padStart(2, "0")}`;
}

function formatRelative(value) {
  if (!value) return "Recently";
  const stamp = new Date(value).getTime();
  if (!Number.isFinite(stamp)) return "Recently";
  const diff = Math.max(0, Date.now() - stamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(stamp));
}

const gradients = [
  "from-violet-500 via-fuchsia-500 to-indigo-700",
  "from-cyan-400 via-blue-500 to-violet-700",
  "from-orange-300 via-rose-500 to-fuchsia-700",
  "from-emerald-300 via-teal-500 to-cyan-700",
  "from-pink-400 via-fuchsia-500 to-purple-700",
];

function StatCard({ icon: Icon, label, value, loading }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 sm:p-5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/45">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 truncate text-xl font-semibold tracking-[-0.04em] sm:text-2xl">
          {loading ? "—" : value}
        </span>
      </div>
      <p className="mt-3 truncate text-xs text-white/35 sm:mt-4">{label}</p>
    </div>
  );
}

function Artwork({ song, index = 0, size = "md" }) {
  const dimension = size === "lg" ? "h-24 w-24 sm:h-28 sm:w-28" : "h-12 w-12";
  const text = size === "lg" ? "text-3xl" : "text-base";
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-[1.4rem] bg-gradient-to-br ${gradients[index % gradients.length]} ${dimension} ${text} font-semibold shadow-xl shadow-black/20`}>
      {(song?.title?.slice(0, 1) || "S").toUpperCase()}
    </div>
  );
}

export default function DashboardHome() {
  const player = useSunoPlayer();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState(null);

  const loadDashboard = useCallback(async (manual = false) => {
    setError("");
    if (manual) setRefreshing(true);
    else setLoading(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await fetch("/api/dashboard/summary", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to load your Suno home.");
      }
      setData(result.data);
    } catch (loadError) {
      if (loadError?.name === "AbortError") {
        setError("The dashboard took too long to respond. Please try again.");
      } else {
        setError(loadError instanceof Error ? loadError.message : "Unable to load your Suno home.");
      }
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const songs = Array.isArray(data?.recentSongs) ? data.recentSongs : [];
  const rooms = Array.isArray(data?.rooms) ? data.rooms : [];
  const stats = data?.stats || {};
  const userName = data?.user?.name?.trim()?.split(/\s+/)[0] || "there";
  const current = player.currentSong;
  const featuredSong = current || songs[0] || null;
  const queue = useMemo(
    () => (songs.length ? songs : featuredSong ? [featuredSong] : []),
    [songs, featuredSong],
  );

  async function playSong(song) {
    if (!song) return;
    setPlayingId(song.id);
    try {
      await playerStore.play(song, queue);
    } finally {
      setPlayingId(null);
    }
  }

  const progress = player.duration > 0
    ? Math.min(100, Math.max(0, (player.currentTime / player.duration) * 100))
    : 0;

  return (
    <div className="min-w-0 overflow-x-clip pb-8 text-white">
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-5 sm:space-y-7">
        <section className="min-w-0">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-violet-300/15 bg-violet-400/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200">
                <Sparkles className="h-3 w-3 shrink-0" />
                <span className="truncate">Suno home</span>
              </span>
              <h1 className="mt-3 break-words text-[2rem] font-semibold leading-[1.08] tracking-[-0.05em] sm:mt-4 sm:text-4xl lg:text-5xl">
                Good to see you, {userName}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45 sm:mt-3 sm:text-base">
                Your music, your rooms, and everything you need to start listening together.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:shrink-0">
              <Link href="/search" className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-semibold text-white/70 transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white sm:px-4">
                <Search className="h-4 w-4 shrink-0" />
                <span>Search</span>
              </Link>
              <Link href="/upload" className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-xs font-semibold text-black transition hover:-translate-y-0.5 hover:bg-violet-50 sm:px-4">
                <UploadCloud className="h-4 w-4 shrink-0" />
                <span>Upload</span>
              </Link>
              <button type="button" onClick={() => loadDashboard(true)} disabled={refreshing} className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3 text-xs font-semibold text-white/50 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50 sm:col-span-1 sm:h-11 sm:px-4">
                <RefreshCw className={`h-4 w-4 shrink-0 ${refreshing ? "animate-spin" : ""}`} />
                <span>{refreshing ? "Refreshing" : "Refresh"}</span>
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 break-words text-sm text-red-200/80">{error}</p>
            <button type="button" onClick={() => loadDashboard(true)} className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-red-300/15 bg-red-300/5 px-3 text-xs font-semibold text-red-100">
              Try again
            </button>
          </div>
        ) : null}

        <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.85fr)]">
          <div className="relative min-w-0 overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-4 shadow-2xl shadow-black/20 sm:rounded-[2rem] sm:p-6">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="relative min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                <Headphones className="h-3.5 w-3.5 shrink-0" />
                Continue listening
              </div>

              <div className="mt-4 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4">
                <Artwork song={featuredSong} size="lg" />

                <div className="min-w-0">
                  <p className="truncate text-[1.05rem] font-semibold tracking-[-0.025em] sm:text-2xl">
                    {featuredSong?.title || "Your next song is waiting."}
                  </p>
                  <p className="mt-1 truncate text-xs text-white/45 sm:text-sm">
                    {featuredSong?.artist || "Build your library and start listening."}
                  </p>
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-[10px] text-white/30 sm:text-[11px]">
                    <span>{featuredSong ? formatDuration(featuredSong.durationSeconds) : "MP3 library"}</span>
                    {current ? <span className="rounded-full border border-violet-300/10 bg-violet-300/[0.06] px-2 py-1 text-violet-200/75">Now playing</span> : null}
                  </div>
                </div>

                <button type="button" onClick={() => featuredSong && (player.currentSong?.id === featuredSong.id ? playerStore.toggle() : playSong(featuredSong))} disabled={!featuredSong || player.isLoading || Boolean(playingId)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-black shadow-lg transition hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50" aria-label={player.isPlaying ? "Pause" : "Play"}>
                  {player.isLoading || playingId === featuredSong?.id ? <Loader2 className="h-5 w-5 animate-spin" /> : player.isPlaying && player.currentSong?.id === featuredSong?.id ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
                </button>
              </div>

              <div className="mt-4 sm:mt-5">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-[width] duration-200" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-white/25">
                  <span>{formatDuration(player.currentTime)}</span>
                  <span>{formatDuration(player.duration || featuredSong?.durationSeconds)}</span>
                </div>
              </div>

              <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                <Link href="/library" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-xs font-semibold text-black">
                  <LibraryBig className="h-3.5 w-3.5" /> Open library
                </Link>
                <Link href="/rooms" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 text-xs font-semibold text-white/55 hover:text-white">
                  <UsersRound className="h-3.5 w-3.5" /> Listen together
                </Link>
              </div>
            </div>
          </div>

          <div className="relative min-w-0 overflow-hidden rounded-[1.75rem] border border-violet-300/10 bg-gradient-to-br from-violet-500/[0.12] via-white/[0.035] to-fuchsia-500/[0.08] p-5 sm:rounded-[2rem] sm:p-6">
            <div className="absolute -bottom-16 -right-8 h-36 w-36 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="relative flex min-w-0 h-full flex-col">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/10"><UsersRound className="h-5 w-5 text-violet-200" /></div>
              <span className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/55">Listen together</span>
              <h2 className="mt-2 max-w-full text-xl font-semibold leading-tight tracking-[-0.03em] sm:text-2xl">Create a room and bring your people into the same song.</h2>
              <p className="mt-3 max-w-full text-sm leading-6 text-white/40">One shared queue, realtime playback, and everyone can control the listening session.</p>
              <div className="mt-6 sm:mt-auto sm:pt-8"><Link href="/rooms" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-xs font-semibold text-black transition hover:-translate-y-0.5">Open rooms <ArrowRight className="h-4 w-4" /></Link></div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={LibraryBig} label="Library tracks" value={stats.totalLibraryTracks ?? 0} loading={loading} />
          <StatCard icon={Clock3} label="Library minutes" value={stats.totalLibraryMinutes ?? 0} loading={loading} />
          <StatCard icon={UploadCloud} label="Your uploads" value={stats.myUploads ?? 0} loading={loading} />
          <StatCard icon={UsersRound} label="Active rooms" value={stats.activeRooms ?? 0} loading={loading} />
        </section>

        <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,.8fr)]">
          <section className="min-w-0 overflow-hidden rounded-[1.7rem] border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
            <div className="flex min-w-0 items-end justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Shared library</span>
                <h2 className="mt-1 truncate text-lg font-semibold">Recently added</h2>
              </div>
              <Link href="/library" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-white/45 hover:bg-white/[0.04] hover:text-white">
                See all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-3 divide-y divide-white/[0.06]">
              {loading ? Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex min-w-0 items-center gap-3 py-3">
                  <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-white/[0.06]" />
                  <div className="min-w-0 flex-1 space-y-2"><div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.06]" /><div className="h-2.5 w-1/3 animate-pulse rounded bg-white/[0.05]" /></div>
                </div>
              )) : songs.length ? songs.map((song, index) => (
                <div key={song.id} className="flex min-w-0 items-center gap-3 py-3">
                  <Artwork song={song} index={index} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/85">{song.title}</p>
                    <p className="truncate text-xs text-white/35">{song.artist || "Unknown artist"} · {formatRelative(song.createdAt)}</p>
                  </div>
                  <span className="hidden shrink-0 text-[11px] text-white/25 sm:block">{formatDuration(song.durationSeconds)}</span>
                  <button type="button" onClick={() => playSong(song)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/50 transition hover:bg-white/[0.06] hover:text-white active:scale-95" aria-label={`Play ${song.title}`}>
                    {playingId === song.id ? <Loader2 className="h-4 w-4 animate-spin" /> : player.currentSong?.id === song.id && player.isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
                  </button>
                </div>
              )) : (
                <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] px-5 py-10 text-center">
                  <LibraryBig className="h-6 w-6 text-white/25" />
                  <p className="mt-3 text-sm font-medium">Your shared library is empty.</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-white/30">Upload your first MP3 and it will appear here for the whole Suno community.</p>
                  <Link href="/upload" className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-black"><Plus className="h-3.5 w-3.5" /> Upload music</Link>
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-[1.7rem] border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
            <div className="flex min-w-0 items-end justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Your rooms</span>
                <h2 className="mt-1 truncate text-lg font-semibold">Active listening spaces</h2>
              </div>
              <Link href="/rooms" className="inline-flex shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-white/45 hover:bg-white/[0.04] hover:text-white">Open rooms</Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {rooms.length ? rooms.map((room) => (
                <Link key={room.id} href={`/rooms?roomId=${encodeURIComponent(room.id)}`} className="group block min-w-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-black/10 p-4 transition hover:border-white/[0.11] hover:bg-white/[0.035]">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300/10 bg-violet-300/[0.06] text-violet-200"><UsersRound className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{room.name}</p>
                      <p className="mt-1 truncate text-xs text-white/30">{room.memberCount}/{room.maxMembers} members · {formatRelative(room.updatedAt)}</p>
                      {room.currentSong ? <p className="mt-2 truncate text-xs text-violet-200/65">{room.isPlaying ? "Playing" : "Paused"} · {room.currentSong.title}</p> : null}
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/55" />
                  </div>
                </Link>
              )) : (
                <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] px-4 py-10 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.025] text-white/25">
                    <UsersRound className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium">No active rooms yet.</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-white/30">Start a room and invite your people with the secret code.</p>
                  <Link href="/rooms" className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-black">Create room <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              )}
            </div>
          </section>
        </section>

        <section className="min-w-0 overflow-hidden rounded-[1.7rem] border border-violet-300/10 bg-gradient-to-r from-violet-500/[0.09] via-white/[0.025] to-fuchsia-500/[0.07] p-4 sm:p-6">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/45">Next up</span>
              <h2 className="mt-1 break-words text-lg font-semibold">Find a song. Start a room. Share the moment.</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/35">Everything you upload stays inside Suno’s shared listening experience.</p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2 sm:shrink-0">
              <Link href="/library" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-xs font-semibold text-black">Discover music <ArrowRight className="h-3.5 w-3.5" /></Link>
              <Link href="/rooms" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 text-xs font-semibold text-white/55 hover:text-white"><UsersRound className="h-3.5 w-3.5" /> Start room</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}