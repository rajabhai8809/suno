"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Clock3,
  Headphones,
  Loader2,
  Music2,
  Pause,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  UsersRound,
  Volume2,
  X,
} from "lucide-react";

const LIMIT = 20;

const artworkThemes = [
  {
    gradient: "from-violet-500 via-fuchsia-500 to-indigo-700",
    glow: "rgba(168,85,247,.28)",
  },
  {
    gradient: "from-cyan-400 via-blue-500 to-violet-700",
    glow: "rgba(59,130,246,.22)",
  },
  {
    gradient: "from-orange-300 via-rose-500 to-fuchsia-700",
    glow: "rgba(244,63,94,.22)",
  },
  {
    gradient: "from-emerald-300 via-teal-500 to-cyan-700",
    glow: "rgba(20,184,166,.22)",
  },
  {
    gradient: "from-pink-400 via-fuchsia-500 to-purple-700",
    glow: "rgba(217,70,239,.22)",
  },
  {
    gradient: "from-indigo-400 via-violet-500 to-fuchsia-600",
    glow: "rgba(99,102,241,.22)",
  },
];

const moods = [
  {
    title: "Late Night",
    subtitle: "Slow & atmospheric",
    gradient: "from-indigo-950 via-violet-900 to-fuchsia-800",
    symbol: "✦",
  },
  {
    title: "Chill",
    subtitle: "Easy listening",
    gradient: "from-cyan-950 via-slate-800 to-blue-900",
    symbol: "◌",
  },
  {
    title: "Feel Good",
    subtitle: "Bright energy",
    gradient: "from-orange-950 via-rose-900 to-fuchsia-900",
    symbol: "✺",
  },
  {
    title: "Focus",
    subtitle: "Stay in the zone",
    gradient: "from-emerald-950 via-teal-900 to-cyan-900",
    symbol: "⌁",
  },
];

function formatDuration(seconds) {
  const value = Number(seconds);

  if (!Number.isFinite(value)) {
    return "--:--";
  }

  const total = Math.max(0, Math.floor(value));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function artwork(index = 0) {
  return artworkThemes[index % artworkThemes.length];
}

function Artwork({ title, index = 0, className = "" }) {
  const theme = artwork(index);

  return (
    <div
      className={`suno-lib-art bg-gradient-to-br ${theme.gradient} ${className}`}
      style={{ "--suno-art-glow": theme.glow }}
      aria-hidden="true"
    >
      <span>{title?.trim()?.charAt(0)?.toUpperCase() || "♪"}</span>
      <i />
      <b />
    </div>
  );
}

function Waveform({ active = false, compact = false }) {
  const bars = compact
    ? [30, 55, 40, 70, 47, 61, 36, 55]
    : [25, 46, 31, 64, 40, 78, 48, 67, 36, 55, 71, 44, 58, 31];

  return (
    <span
      className={`suno-lib-wave ${active ? "active" : ""} ${compact ? "compact" : ""}`}
      aria-hidden="true"
    >
      {bars.map((height, index) => (
        <i
          key={index}
          style={{
            height: `${height}%`,
            animationDelay: `${index * 55}ms`,
          }}
        />
      ))}
    </span>
  );
}

export default function Library({ searchOnly = false }) {
  const audioRef = useRef(null);
  const searchRef = useRef(null);
  const requestControllerRef = useRef(null);

  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [search, setSearch] = useState("");
  const [artist, setArtist] = useState("");
  const [duration, setDuration] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: LIMIT,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [playingId, setPlayingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const activeSong = useMemo(
    () => songs.find((song) => song.id === playingId) || null,
    [songs, playingId],
  );

  const featuredSongs = songs.slice(0, 5);
  const recentSongs = songs.slice(0, 8);

  const hasFilters =
    Boolean(search.trim()) ||
    Boolean(artist) ||
    duration !== "all" ||
    sort !== "recent";

  useEffect(() => {
    const controller = new AbortController();

    async function loadArtists() {
      try {
        const response = await fetch("/api/songs/artists", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setArtists(Array.isArray(data.artists) ? data.artists : []);
        }
      } catch (requestError) {
        if (requestError?.name !== "AbortError") {
          console.error("[Suno] Artists request failed:", requestError);
        }
      }
    }

    loadArtists();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (requestControllerRef.current) {
      requestControllerRef.current.abort();
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (search.trim()) {
          params.set("q", search.trim());
        }

        if (artist) {
          params.set("artist", artist);
        }

        if (duration !== "all") {
          params.set("duration", duration);
        }

        params.set("sort", sort);
        params.set("page", String(page));
        params.set("limit", String(LIMIT));

        const response = await fetch(
          `/api/songs/library?${params.toString()}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to load the music library.",
          );
        }

        setSongs(Array.isArray(data.songs) ? data.songs : []);
        setPagination(
          data.pagination || {
            page: 1,
            limit: LIMIT,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        );
      } catch (requestError) {
        if (requestError?.name === "AbortError") {
          return;
        }

        console.error("[Suno] Library request failed:", requestError);
        setSongs([]);
        setError(
          requestError?.message ||
            "Unable to load the music library.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, artist, duration, sort, page]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const onTime = () => {
      setCurrentTime(
        Number.isFinite(audio.currentTime)
          ? audio.currentTime
          : 0,
      );
    };

    const onMeta = () => {
      setAudioDuration(
        Number.isFinite(audio.duration)
          ? audio.duration
          : 0,
      );
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onError = () => {
      setIsPlaying(false);
      setPlayerError("This song could not be played.");
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (searchOnly) {
      searchRef.current?.focus();
    }
  }, [searchOnly]);

  async function playSong(song) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setPlayerError("");

    if (playingId === song.id) {
      if (audio.paused) {
        try {
          await audio.play();
        } catch (playError) {
          console.error("[Suno] Resume failed:", playError);
          setPlayerError("Unable to resume this song.");
        }
      } else {
        audio.pause();
      }

      return;
    }

    setPlayerLoading(true);
    setPlayingId(song.id);
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(Number(song.durationSeconds) || 0);

    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();

      const response = await fetch(
        `/api/songs/${song.id}/stream`,
        {
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success || !data.url) {
        throw new Error(
          data.message || "Unable to prepare this song.",
        );
      }

      audio.src = data.url;
      await audio.play();
    } catch (playError) {
      console.error("[Suno] Playback failed:", playError);
      setPlayingId(null);
      setIsPlaying(false);
      setPlayerError(
        playError?.message || "Unable to play this song.",
      );
    } finally {
      setPlayerLoading(false);
    }
  }

  function togglePlayback() {
    const audio = audioRef.current;

    if (!audio || !activeSong) {
      return;
    }

    if (audio.paused) {
      audio.play().catch((playError) => {
        console.error("[Suno] Resume failed:", playError);
        setPlayerError("Unable to resume this song.");
      });
    } else {
      audio.pause();
    }
  }

  function seek(value) {
    const audio = audioRef.current;
    const nextValue = Number(value);

    if (!audio || !Number.isFinite(nextValue)) {
      return;
    }

    audio.currentTime = nextValue;
    setCurrentTime(nextValue);
  }

  function clearAll() {
    setSearch("");
    setArtist("");
    setDuration("all");
    setSort("recent");
    setPage(1);
    setError("");
  }

  function focusSearch() {
    searchRef.current?.focus();
  }

  return (
    <div
      className={`suno-page-stack suno-library-v2 ${
        searchOnly ? "search-only" : ""
      }`}
    >
      <audio
        ref={audioRef}
        preload="metadata"
        className="hidden"
      />

      {!searchOnly && (
        <>
          <section className="suno-library-v2-hero">
            <div className="suno-library-v2-hero-copy">
              <span className="suno-eyebrow-pill">
                <Sparkles size={12} /> SHARED LIBRARY
              </span>

              <h1>
                Music for
                <span>the moment.</span>
              </h1>

              <p>
                Discover songs uploaded by the Suno community,
                save your favorites for later, or take one into
                a room and listen together.
              </p>

              <div className="suno-library-v2-hero-actions">
                <Link
                  href="/upload"
                  className="suno-light-button"
                >
                  <UploadCloud size={15} />
                  Upload MP3
                </Link>

                <Link
                  href="/rooms"
                  className="suno-dark-button"
                >
                  <UsersRound size={15} />
                  Open a room
                </Link>
              </div>
            </div>

            <div className="suno-library-v2-hero-visual">
              <div className="suno-library-v2-orbit" />

              <div className="suno-library-v2-feature-art">
                <Artwork
                  title={featuredSongs[0]?.title || "S"}
                  index={0}
                />
              </div>

              <div className="suno-library-v2-visual-copy">
                <span>NOW DISCOVERING</span>
                <strong>
                  {featuredSongs[0]?.title || "Your next favorite song"}
                </strong>
                <small>
                  {featuredSongs[0]?.artist ||
                    "Build your shared music library"}
                </small>
              </div>

              <Waveform active />
            </div>
          </section>

          <section className="suno-section-block">
            <div className="suno-section-heading-row">
              <div>
                <span className="suno-section-overline">
                  QUICK START
                </span>
                <h2>Make something happen.</h2>
              </div>
            </div>

            <div className="suno-library-v2-quick-grid">
              <button
                type="button"
                onClick={focusSearch}
                className="suno-library-v2-quick-card"
              >
                <span className="purple">
                  <Search size={17} />
                </span>
                <div>
                  <strong>Find a song</strong>
                  <small>Search titles, artists and albums</small>
                </div>
                <ArrowRight size={15} />
              </button>

              <Link
                href="/rooms"
                className="suno-library-v2-quick-card"
              >
                <span className="pink">
                  <Headphones size={17} />
                </span>
                <div>
                  <strong>Listen together</strong>
                  <small>Create or join a room</small>
                </div>
                <ArrowRight size={15} />
              </Link>

              <Link
                href="/upload"
                className="suno-library-v2-quick-card"
              >
                <span className="cyan">
                  <UploadCloud size={17} />
                </span>
                <div>
                  <strong>Add your music</strong>
                  <small>Upload an MP3 to Suno</small>
                </div>
                <ArrowRight size={15} />
              </Link>
            </div>
          </section>

          <section className="suno-section-block">
            <div className="suno-section-heading-row">
              <div>
                <span className="suno-section-overline">
                  FRESH FOR YOU
                </span>
                <h2>Recently added.</h2>
              </div>

              <span className="suno-library-v2-section-note">
                {pagination.total} songs
              </span>
            </div>

            {loading ? (
              <div className="suno-library-v2-featured-grid">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="suno-library-v2-featured-skeleton"
                  />
                ))}
              </div>
            ) : featuredSongs.length > 0 ? (
              <div className="suno-library-v2-featured-grid">
                {featuredSongs.map((song, index) => {
                  const current = playingId === song.id;
                  const playing = current && isPlaying;

                  return (
                    <button
                      type="button"
                      key={song.id}
                      className={`suno-library-v2-feature-card ${
                        playing ? "playing" : ""
                      }`}
                      onClick={() => playSong(song)}
                    >
                      <div className="suno-library-v2-feature-art-wrap">
                        <Artwork title={song.title} index={index} />

                        <span className="suno-library-v2-feature-play">
                          {playerLoading && current ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                          ) : playing ? (
                            <Pause
                              size={15}
                              fill="currentColor"
                            />
                          ) : (
                            <Play
                              size={14}
                              fill="currentColor"
                            />
                          )}
                        </span>
                      </div>

                      <div>
                        <p title={song.title}>{song.title}</p>
                        <small>
                          {song.artist || "Unknown artist"}
                        </small>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="suno-empty-inline">
                <Music2 size={17} />
                <div>
                  <strong>Your shared library is empty.</strong>
                  <span>
                    Upload an MP3 and it will appear here for everyone.
                  </span>
                </div>
                <Link href="/upload">
                  Upload <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </section>
        </>
      )}

      {/* Search and filter bar */}
      <section
        id="library-search"
        className="suno-library-v2-controls suno-section-block"
      >
        <div className="suno-section-heading-row">
          <div>
            <span className="suno-section-overline">
              {searchOnly ? "SEARCH" : "ALL MUSIC"}
            </span>
            <h2>Find what you want.</h2>
          </div>
        </div>

        <div className="suno-library-v2-search-row">
          <div className="suno-library-v2-search">
            <Search size={16} />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              maxLength={80}
              placeholder="Search songs, artists or albums..."
              aria-label="Search songs, artists or albums"
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={`suno-library-v2-filter-trigger ${
              showFilters ? "active" : ""
            }`}
            onClick={() => setShowFilters((value) => !value)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={15} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="suno-library-v2-filter-panel">
            <label>
              Artist
              <span>
                <select
                  value={artist}
                  onChange={(event) => {
                    setArtist(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All artists</option>
                  {artists.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name} ({item.count})
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </span>
            </label>

            <label>
              Length
              <span>
                <select
                  value={duration}
                  onChange={(event) => {
                    setDuration(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Any length</option>
                  <option value="short">Under 4 minutes</option>
                  <option value="long">4 minutes or more</option>
                </select>
                <ChevronDown size={13} />
              </span>
            </label>

            <label>
              Sort
              <span>
                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="recent">Recently added</option>
                  <option value="title">Title A–Z</option>
                  <option value="artist">Artist A–Z</option>
                  <option value="duration">Shortest first</option>
                </select>
                <ChevronDown size={13} />
              </span>
            </label>

            {hasFilters && (
              <button
                type="button"
                className="suno-library-v2-clear"
                onClick={clearAll}
              >
                Clear filters
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </section>

      {/* Main track list */}
      <section className="suno-section-block suno-library-v2-tracks">
        <div className="suno-section-heading-row">
          <div>
            <span className="suno-section-overline">
              TRACKS
            </span>
            <h2>
              {loading
                ? "Loading..."
                : `${pagination.total} ${pagination.total === 1 ? "song" : "songs"}`}
            </h2>
          </div>

          <Link
            href="/upload"
            className="suno-outline-action"
          >
            <UploadCloud size={14} />
            Upload
          </Link>
        </div>

        {error && (
          <div className="suno-library-v2-alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="suno-library-v2-track-skeletons">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="suno-library-v2-track-skeleton"
              />
            ))}
          </div>
        ) : recentSongs.length === 0 ? (
          <div className="suno-library-v2-empty">
            <div>
              <Music2 size={20} />
            </div>
            <h3>No songs found.</h3>
            <p>
              {hasFilters
                ? "Try another search or clear your filters."
                : "Upload your first MP3 to start the shared library."}
            </p>
            <button
              type="button"
              onClick={hasFilters ? clearAll : focusSearch}
            >
              {hasFilters ? "Clear filters" : "Search music"}
            </button>
          </div>
        ) : (
          <div className="suno-library-v2-track-list">
            {recentSongs.map((song, index) => {
              const current = playingId === song.id;
              const playing = current && isPlaying;
              const pending = current && playerLoading;

              return (
                <article
                  key={song.id}
                  className={`suno-library-v2-track ${
                    playing ? "playing" : ""
                  }`}
                >
                  <span className="suno-library-v2-track-number">
                    {playing ? (
                      <Waveform active compact />
                    ) : (
                      String(
                        (pagination.page - 1) * LIMIT + index + 1,
                      ).padStart(2, "0")
                    )}
                  </span>

                  <button
                    type="button"
                    className="suno-library-v2-track-core"
                    onClick={() => playSong(song)}
                  >
                    <span className="suno-library-v2-track-art">
                      <Artwork title={song.title} index={index} />
                      <i>
                        {pending ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                        ) : playing ? (
                          <Pause
                            size={13}
                            fill="currentColor"
                          />
                        ) : (
                          <Play
                            size={12}
                            fill="currentColor"
                          />
                        )}
                      </i>
                    </span>

                    <span className="suno-library-v2-track-copy">
                      <strong title={song.title}>
                        {song.title}
                      </strong>
                      <small title={song.artist || "Unknown artist"}>
                        {song.artist || "Unknown artist"}
                        {song.album ? ` · ${song.album}` : ""}
                      </small>
                    </span>
                  </button>

                  <span className="suno-library-v2-track-wave">
                    <Waveform active={playing} compact />
                  </span>

                  <span className="suno-library-v2-track-date">
                    {formatDate(song.createdAt)}
                  </span>

                  <span className="suno-library-v2-track-duration">
                    <Clock3 size={11} />
                    {formatDuration(song.durationSeconds)}
                  </span>

                  <button
                    type="button"
                    className="suno-library-v2-track-play"
                    onClick={() => playSong(song)}
                    aria-label={`${playing ? "Pause" : "Play"} ${song.title}`}
                  >
                    {pending ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : playing ? (
                      <CirclePause size={18} />
                    ) : (
                      <CirclePlay size={18} />
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {!loading && recentSongs.length > 0 && (
          <div className="suno-pagination-row">
            <span>
              Page <strong>{pagination.page}</strong> of{" "}
              <strong>{pagination.totalPages}</strong>
            </span>

            <div>
              <button
                type="button"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>

              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((value) => value + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>

      {!searchOnly && (
        <section className="suno-section-block">
          <div className="suno-section-heading-row">
            <div>
              <span className="suno-section-overline">
                MOODS
              </span>
              <h2>Pick a feeling.</h2>
            </div>
          </div>

          <div className="suno-library-v2-moods">
            {moods.map((mood) => (
              <button
                key={mood.title}
                type="button"
                className="suno-library-v2-mood"
              >
                <div className={`bg-gradient-to-br ${mood.gradient}`}>
                  <span>{mood.symbol}</span>
                </div>
                <strong>{mood.title}</strong>
                <small>{mood.subtitle}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {activeSong && (
        <div className="suno-library-v2-player">
          <div className="suno-library-v2-player-song">
            <Artwork title={activeSong.title} index={0} />
            <div>
              <strong title={activeSong.title}>
                {activeSong.title}
              </strong>
              <small>
                {activeSong.artist || "Unknown artist"}
              </small>
            </div>
          </div>

          <div className="suno-library-v2-player-center">
            <div className="suno-library-v2-player-controls">
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause size={15} fill="currentColor" />
                ) : (
                  <Play size={15} fill="currentColor" />
                )}
              </button>
            </div>

            <div className="suno-library-v2-player-progress">
              <span>
                {formatDuration(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={
                  audioDuration ||
                  Number(activeSong.durationSeconds) ||
                  0
                }
                value={Math.min(
                  currentTime,
                  audioDuration ||
                    Number(activeSong.durationSeconds) ||
                    0,
                )}
                onChange={(event) => seek(event.target.value)}
                aria-label="Playback position"
              />
              <span>
                {formatDuration(
                  audioDuration ||
                    Number(activeSong.durationSeconds),
                )}
              </span>
            </div>
          </div>

          <div className="suno-library-v2-player-volume">
            <Volume2 size={14} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(event) =>
                setVolume(Number(event.target.value))
              }
              aria-label="Volume"
            />
          </div>
        </div>
      )}

      {playerError && (
        <div className="suno-library-v2-player-error">
          {playerError}
        </div>
      )}
    </div>
  );
}