"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Headphones,
  LibraryBig,
  Loader2,
  Music2,
  Pause,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  UsersRound,
  X,
} from "lucide-react";

import { playerStore, useSunoPlayer } from "@/lib/player/sunoPlayerStore";
import { useSunoRoomRealtime } from "@/lib/realtime/useSunoRoomRealtime";

const PAGE_SIZE = 40;

const gradientClasses = [
  "from-violet-500 via-fuchsia-500 to-indigo-700",
  "from-cyan-400 via-blue-500 to-violet-700",
  "from-orange-300 via-rose-500 to-fuchsia-700",
  "from-emerald-300 via-teal-500 to-cyan-700",
  "from-pink-400 via-fuchsia-500 to-purple-700",
  "from-indigo-400 via-violet-500 to-fuchsia-600",
];

const fallbackGenres = [
  "Pop", "Bollywood", "Hip-Hop", "Indie", "Rock", "Lo-fi", "Electronic", "Classical",
];
const fallbackLanguages = ["Hindi", "English", "Punjabi", "Bengali", "Tamil", "Telugu", "Urdu"];

function formatDuration(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function relativeDate(value) {
  if (!value) return "Recently";
  const stamp = new Date(value).getTime();
  if (!Number.isFinite(stamp)) return "Recently";
  const diff = Math.max(0, Date.now() - stamp);
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(stamp));
}

function artworkClass(index = 0) {
  return gradientClasses[index % gradientClasses.length];
}

function Artwork({ song, index = 0, className = "" }) {
  const letter = song?.title?.trim()?.charAt(0)?.toUpperCase() || "♪";
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${artworkClass(index)} ${className}`}>
      <div className="absolute -right-4 -top-5 h-16 w-16 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute -bottom-6 -left-4 h-14 w-14 rounded-full bg-black/20 blur-xl" />
      <span className="relative z-10 font-semibold text-white drop-shadow-md">{letter}</span>
    </div>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition ${
        active
          ? "border-violet-300/30 bg-violet-300/12 text-violet-100"
          : "border-white/[0.07] bg-white/[0.025] text-white/45 hover:border-white/[0.13] hover:bg-white/[0.05] hover:text-white/75"
      }`}
    >
      {active ? <Check className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

function SongRow({ song, index, onPlay, pending, active }) {
  return (
    <article className={`group flex min-w-0 items-center gap-3 rounded-2xl border p-2.5 sm:p-3 ${active ? "border-violet-300/15 bg-violet-400/[0.06]" : "border-transparent bg-white/[0.018] hover:border-white/[0.07] hover:bg-white/[0.03]"}`}>
      <span className="hidden w-7 shrink-0 text-center text-[10px] tabular-nums text-white/20 sm:block">
        {String(index + 1).padStart(2, "0")}
      </span>
      <button type="button" onClick={() => onPlay(song)} disabled={pending} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
        <Artwork song={song} index={index} className="grid h-full w-full place-items-center" />
        <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 transition group-hover:opacity-100">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
        </span>
      </button>
      <button type="button" onClick={() => onPlay(song)} disabled={pending} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold text-white/85">{song.title}</p>
        <p className="mt-0.5 truncate text-xs text-white/35">{song.artist || "Unknown artist"}{song.album ? ` · ${song.album}` : ""}</p>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/20">
          <span className="truncate">{song.genre || "Other"}</span>
          <span>·</span>
          <span>{song.language || "Unknown"}</span>
        </div>
      </button>
      <span className="hidden shrink-0 items-center gap-1 text-[10px] text-white/25 md:flex"><Clock3 className="h-3 w-3" />{formatDuration(song.durationSeconds)}</span>
      <button type="button" onClick={() => onPlay(song)} disabled={pending} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/50 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50" aria-label={`Play ${song.title}`}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
      </button>
    </article>
  );
}

export default function Library({ searchOnly = false, initialScope = "all" }) {
  const searchRef = useRef(null);
  const requestControllerRef = useRef(null);
  const loadMoreRef = useRef(null);

  const [scope, setScope] = useState(initialScope === "mine" ? "mine" : "all");
  const [roomContextId, setRoomContextId] = useState("");
  const [roomQueueMode, setRoomQueueMode] = useState(false);
  const [roomActionId, setRoomActionId] = useState(null);
  const [roomMessage, setRoomMessage] = useState("");

  const [songs, setSongs] = useState([]);
  const [search, setSearch] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("");
  const [duration, setDuration] = useState("all");
  const [sort, setSort] = useState("recent");
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, hasNextPage: false });
  const [facets, setFacets] = useState({ artists: [], genres: [], languages: [] });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const player = useSunoPlayer();
  const roomRealtime = useSunoRoomRealtime(roomContextId, Boolean(roomContextId), false);
  const playingId = player.currentSong?.id || null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRoomContextId(params.get("roomId")?.trim() || "");
    setRoomQueueMode((params.get("mode") || "").toLowerCase() === "queue");
    if (initialScope !== "mine") setScope(params.get("scope") === "mine" ? "mine" : "all");
  }, [initialScope]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/songs/facets", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (response.ok && result?.success) setFacets(result.facets || {});
      })
      .catch((requestError) => {
        if (requestError?.name !== "AbortError") console.error("[Suno] Facets request failed:", requestError);
      });
    return () => controller.abort();
  }, []);

  const fetchSongs = useCallback(async ({ pageToLoad = 1, append = false } = {}) => {
    if (requestControllerRef.current) requestControllerRef.current.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    if (append) setLoadingMore(true); else setLoading(true);
    if (!append) setError("");

    const params = new URLSearchParams({
      scope,
      page: String(pageToLoad),
      limit: String(PAGE_SIZE),
      sort,
    });
    if (search.trim()) params.set("q", search.trim());
    if (artist) params.set("artist", artist);
    if (genre) params.set("genre", genre);
    if (language) params.set("language", language);
    if (duration !== "all") params.set("duration", duration);

    try {
      const response = await fetch(`/api/songs/library?${params.toString()}`, {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.message || "Unable to load songs.");
      const nextSongs = Array.isArray(result.songs) ? result.songs : [];
      setSongs((current) => (append ? [...current, ...nextSongs] : nextSongs));
      setPagination(result.pagination || { page: pageToLoad, total: 0, totalPages: 1, hasNextPage: false });
    } catch (requestError) {
      if (requestError?.name === "AbortError") return;
      setError(requestError instanceof Error ? requestError.message : "Unable to load songs.");
      if (!append) setSongs([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [scope, search, artist, genre, language, duration, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchSongs({ pageToLoad: 1, append: false }), 180);
    return () => {
      window.clearTimeout(timer);
      requestControllerRef.current?.abort();
    };
  }, [fetchSongs]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loading || loadingMore || !pagination.hasNextPage) return;
        void fetchSongs({ pageToLoad: pagination.page + 1, append: true });
      },
      { rootMargin: "500px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchSongs, loading, loadingMore, pagination]);

  useEffect(() => {
    if (searchOnly) searchRef.current?.focus();
  }, [searchOnly]);

  const featured = songs.slice(0, 8);
  const recent = songs.slice(0, 10);
  const myCount = scope === "mine" ? pagination.total : undefined;
  const activeFilterCount = [artist, genre, language].filter(Boolean).length + (duration !== "all" ? 1 : 0);
  const hasSearch = Boolean(search.trim());
  const availableGenres = facets.genres?.length ? facets.genres : fallbackGenres.map((name) => ({ name, count: 0 }));
  const availableLanguages = facets.languages?.length ? facets.languages : fallbackLanguages.map((name) => ({ name, count: 0 }));

  const playSong = async (song) => {
    if (!song) return;
    if (!roomContextId) {
      playerStore.setExpanded(true);
      await playerStore.play(song, songs.length ? songs : [song]);
      return;
    }

    if (roomRealtime.status !== "connected") {
      setRoomMessage(roomRealtime.status === "connecting" ? "Connecting to the room…" : "Room connection is unavailable.");
      return;
    }

    setRoomActionId(song.id);
    setRoomMessage("");
    try {
      if (roomQueueMode) {
        const result = await roomRealtime.addToQueue(song);
        setRoomMessage(result?.duplicate ? `“${song.title}” is already in the queue.` : `“${song.title}” added to the queue.`);
      } else {
        await roomRealtime.loadSharedSong(song, { positionSeconds: 0, isPlaying: true });
        setRoomMessage(`“${song.title}” is now playing for everyone.`);
      }
      window.location.assign(`/rooms?roomId=${encodeURIComponent(roomContextId)}`);
    } catch (actionError) {
      setRoomMessage(actionError?.message || "Unable to update the room.");
    } finally {
      setRoomActionId(null);
    }
  };

  function clearFilters() {
    setSearch(""); setArtist(""); setGenre(""); setLanguage(""); setDuration("all"); setSort("recent");
  }

  return (
    <div className="space-y-8 pb-10 text-white sm:space-y-10">
      {roomContextId ? (
        <section className="rounded-3xl border border-violet-300/10 bg-violet-400/[0.05] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-200/10 bg-violet-400/[0.08] text-violet-200"><UsersRound className="h-5 w-5" /></div>
              <div className="min-w-0">
                <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-violet-200/55">{roomQueueMode ? "QUEUE PICKER" : "ROOM PICKER"}</span>
                <h2 className="mt-1 text-lg font-semibold">{roomQueueMode ? "Add to the shared queue." : "Choose a song for everyone."}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/40">
                  <span className={`rounded-full border px-2.5 py-1 ${roomRealtime.status === "connected" ? "border-emerald-300/10 bg-emerald-300/8 text-emerald-200" : "border-white/10 bg-white/[0.03] text-white/45"}`}>{roomRealtime.status === "connected" ? "Room connected" : roomRealtime.status === "connecting" ? "Connecting…" : "Room offline"}</span>
                  {roomMessage ? <span>{roomMessage}</span> : null}
                </div>
              </div>
            </div>
            <a href={`/rooms?roomId=${encodeURIComponent(roomContextId)}`} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 text-xs font-semibold text-white/65 hover:bg-white/[0.06] hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Back to room</a>
          </div>
        </section>
      ) : null}

      {!searchOnly && (
        <>
          <section className="overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-br from-white/[0.055] via-white/[0.025] to-violet-500/[0.07] p-5 sm:p-7 lg:p-9">
            <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_.85fr]">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/10 bg-violet-300/[0.07] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-violet-200"><Sparkles className="h-3 w-3" /> Shared library</span>
                <h1 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl lg:text-5xl">All your music, without the clutter.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40 sm:text-base">Browse thousands of community uploads by genre, language, artist or mood. Only the songs you need are rendered at a time.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/upload" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-xs font-semibold text-black"><UploadCloud className="h-3.5 w-3.5" /> Upload MP3</Link>
                  <Link href="/rooms" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3.5 text-xs font-semibold text-white/60 hover:text-white"><UsersRound className="h-3.5 w-3.5" /> Listen together</Link>
                </div>
              </div>
              <div className="hidden min-h-[210px] items-center justify-center lg:flex">
                <div className="relative grid h-52 w-52 place-items-center rounded-[2.5rem] border border-white/[0.08] bg-black/20 shadow-2xl shadow-violet-950/20">
                  <div className="absolute inset-5 rounded-[1.8rem] bg-gradient-to-br from-violet-500/35 via-fuchsia-500/15 to-cyan-400/10 blur-xl" />
                  <div className="relative grid h-36 w-36 place-items-center rounded-[2rem] bg-gradient-to-br from-violet-400 via-fuchsia-500 to-indigo-700 text-5xl font-semibold shadow-2xl">{featured[0]?.title?.slice(0, 1).toUpperCase() || "S"}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3"><div><span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/25">Your library</span><h2 className="mt-1 text-xl font-semibold">Browse your way</h2></div><Link href="/my-uploads" className="text-xs font-semibold text-violet-200/75 hover:text-white">My uploads <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>
            <div className="flex overflow-x-auto gap-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Chip active={scope === "all"} onClick={() => setScope("all")}>All music</Chip>
              <Chip active={scope === "mine"} onClick={() => setScope("mine")}>My uploads{myCount !== undefined ? ` · ${myCount}` : ""}</Chip>
              {availableGenres.slice(0, 6).map((item) => <Chip key={`genre-${item.name}`} active={genre === item.name} onClick={() => { setGenre(genre === item.name ? "" : item.name); setScope("all"); }}>{item.name}</Chip>)}
            </div>
          </section>

          {!hasSearch && scope === "all" && (
            <>
              <section className="space-y-4">
                <div className="flex items-end justify-between gap-3"><div><span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/25">Recently added</span><h2 className="mt-1 text-xl font-semibold">Fresh into Suno</h2></div><span className="text-xs text-white/25">{pagination.total.toLocaleString()} songs</span></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {loading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/[0.045]" />) : featured.map((song, index) => {
                    const active = playingId === song.id;
                    return <button key={song.id} type="button" onClick={() => void playSong(song)} className="min-w-0 text-left group"><div className="relative aspect-square overflow-hidden rounded-2xl"><Artwork song={song} index={index} className="grid h-full w-full place-items-center text-3xl" /><span className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-white text-black opacity-100 shadow-lg transition sm:opacity-0 sm:group-hover:opacity-100">{active && player.isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}</span></div><p className="mt-2 truncate text-sm font-semibold text-white/80">{song.title}</p><p className="truncate text-xs text-white/30">{song.artist}</p></button>;
                  })}
                </div>
              </section>

              <section className="space-y-4">
                <div><span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/25">Genres</span><h2 className="mt-1 text-xl font-semibold">Browse by genre</h2></div>
                <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {availableGenres.slice(0, 10).map((item, index) => <button key={item.name} type="button" onClick={() => { setGenre(item.name); setScope("all"); window.scrollTo({ top: document.getElementById("music-browser")?.offsetTop || 0, behavior: "smooth" }); }} className="relative h-24 min-w-[170px] overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.015] p-4 text-left"><div className={`absolute -right-6 -top-7 h-28 w-28 rounded-full bg-gradient-to-br ${artworkClass(index)} opacity-35 blur-2xl`} /><span className="relative block text-sm font-semibold">{item.name}</span><span className="relative mt-1 block text-[10px] text-white/25">{item.count ? `${item.count.toLocaleString()} tracks` : "Explore"}</span></button>)}
                </div>
              </section>
            </>
          )}
        </>
      )}

      <section id="music-browser" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/25">{searchOnly ? "Search" : scope === "mine" ? "My uploads" : "All music"}</span><h2 className="mt-1 text-xl font-semibold">{search ? `Results for “${search}”` : scope === "mine" ? "Your uploaded music" : "Explore the library"}</h2></div>
          <span className="text-xs text-white/25">{pagination.total.toLocaleString()} tracks</span>
        </div>

        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-3 sm:p-4">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" /><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} maxLength={80} placeholder="Songs, artists, albums, genres, languages…" className="h-12 w-full rounded-2xl border border-white/[0.07] bg-black/20 pl-10 pr-10 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-300/25" />{search ? <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X className="h-4 w-4" /></button> : null}</div>
            <button type="button" onClick={() => setShowFilters((value) => !value)} className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${showFilters || activeFilterCount ? "border-violet-300/20 bg-violet-300/[0.08] text-violet-100" : "border-white/[0.07] bg-white/[0.025] text-white/45"}`} aria-label="Toggle filters"><SlidersHorizontal className="h-4 w-4" /></button>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {availableLanguages.slice(0, 10).map((item) => <Chip key={`lang-${item.name}`} active={language === item.name} onClick={() => setLanguage(language === item.name ? "" : item.name)}>{item.name}</Chip>)}
          </div>

          {showFilters ? <div className="mt-3 grid gap-2 rounded-2xl border border-white/[0.06] bg-black/15 p-3 sm:grid-cols-2 lg:grid-cols-5">
            {[{ label: "Artist", value: artist, set: setArtist, items: facets.artists || [] }, { label: "Genre", value: genre, set: setGenre, items: availableGenres }, { label: "Language", value: language, set: setLanguage, items: availableLanguages }].map((field) => <label key={field.label} className="min-w-0"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25">{field.label}</span><span className="relative block"><select value={field.value} onChange={(event) => field.set(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 pr-9 text-xs text-white outline-none"><option value="">All {field.label.toLowerCase()}s</option>{field.items.map((item) => <option key={item.name} value={item.name}>{item.name}{item.count ? ` (${item.count})` : ""}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" /></span></label>)}
            <label className="min-w-0"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25">Length</span><select value={duration} onChange={(event) => setDuration(event.target.value)} className="h-11 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-white outline-none"><option value="all">Any length</option><option value="short">Under 4 minutes</option><option value="long">4 minutes or more</option></select></label>
            <label className="min-w-0"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25">Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)} disabled={!hasSearch && sort === "relevance"} className="h-11 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-white outline-none"><option value="recent">Recently added</option><option value="relevance">Best match</option><option value="title">Title A–Z</option><option value="artist">Artist A–Z</option><option value="duration">Shortest first</option></select></label>
            {(activeFilterCount || sort !== "recent") ? <button type="button" onClick={clearFilters} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs font-semibold text-white/55 hover:text-white">Clear <X className="h-3.5 w-3.5" /></button> : null}
          </div> : null}
        </div>

        {error ? <div className="rounded-2xl border border-red-300/10 bg-red-300/[0.05] p-4 text-sm text-red-100/75">{error}</div> : null}

        <div className="space-y-1.5">
          {loading ? Array.from({ length: 9 }).map((_, index) => <div key={index} className="flex animate-pulse items-center gap-3 rounded-2xl border border-white/[0.04] bg-white/[0.02] p-3"><div className="h-12 w-12 rounded-xl bg-white/[0.06]" /><div className="min-w-0 flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-white/[0.06]" /><div className="h-2.5 w-1/3 rounded bg-white/[0.045]" /></div><div className="h-9 w-9 rounded-xl bg-white/[0.05]" /></div>) : songs.length ? songs.map((song, index) => <SongRow key={song.id} song={song} index={index} onPlay={playSong} pending={roomActionId === song.id || (player.isLoading && playingId === song.id)} active={playingId === song.id} />) : <div className="rounded-3xl border border-dashed border-white/[0.08] p-10 text-center"><Music2 className="mx-auto h-7 w-7 text-white/20" /><h3 className="mt-3 text-base font-semibold">No songs found</h3><p className="mx-auto mt-1 max-w-md text-sm text-white/30">Try another keyword or filter. Your uploaded MP3s will appear in My uploads as soon as processing finishes.</p><button type="button" onClick={clearFilters} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-xs font-semibold text-black">Clear filters</button></div>}
        </div>

        <div ref={loadMoreRef} className="flex min-h-12 items-center justify-center">
          {loadingMore ? <span className="inline-flex items-center gap-2 text-xs text-white/30"><Loader2 className="h-4 w-4 animate-spin" /> Loading more</span> : pagination.hasNextPage ? <span className="text-xs text-white/20">Keep scrolling to load more</span> : songs.length ? <span className="text-xs text-white/20">You reached the end of this result.</span> : null}
        </div>
      </section>

      {!searchOnly && !roomContextId ? <section className="grid gap-3 sm:grid-cols-2"><Link href="/upload" className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:bg-white/[0.04]"><UploadCloud className="h-5 w-5 text-violet-200" /><h3 className="mt-4 text-base font-semibold">Add your music</h3><p className="mt-1 text-sm leading-5 text-white/30">Upload MP3s with genre and language metadata so the library stays easy to explore.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white/55">Upload <ArrowRight className="h-3.5 w-3.5" /></span></Link><Link href="/rooms" className="rounded-3xl border border-violet-300/10 bg-violet-500/[0.05] p-5 transition hover:bg-violet-500/[0.08]"><Headphones className="h-5 w-5 text-violet-200" /><h3 className="mt-4 text-base font-semibold">Listen together</h3><p className="mt-1 text-sm leading-5 text-white/30">Take any shared track into a room and keep everyone on the same playback timeline.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white/65">Open rooms <ArrowRight className="h-3.5 w-3.5" /></span></Link></section> : null}
    </div>
  );
}