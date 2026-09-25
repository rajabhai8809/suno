"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Headphones,
  LibraryBig,
  Play,
  Plus,
  Search,
  UploadCloud,
  UsersRound,
  Sparkles,
} from "lucide-react";

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

const gradients = [
  "from-violet-500 via-fuchsia-500 to-indigo-700",
  "from-cyan-400 via-blue-500 to-violet-700",
  "from-orange-300 via-rose-500 to-fuchsia-700",
  "from-emerald-300 via-teal-500 to-cyan-700",
  "from-pink-400 via-fuchsia-500 to-purple-700",
];

export default function DashboardHome({ name = "there", email = "" }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSongs() {
      try {
        const response = await fetch("/api/songs/mine", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setSongs(data.songs || []);
        }
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error("[Suno] Dashboard songs error:", error);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadSongs();
    return () => controller.abort();
  }, []);

  const stats = useMemo(() => {
    const total = songs.length;
    const minutes = songs.reduce(
      (sum, song) => sum + (Number(song.durationSeconds) || 0),
      0,
    );
    return {
      total,
      minutes: Math.round(minutes / 60),
    };
  }, [songs]);

  const featured = songs[0] || null;
  const recent = songs.slice(0, 6);

  return (
    <div className="suno-page-stack">
      <section className="suno-dashboard-topbar">
        <div>
          <span className="suno-eyebrow-pill"><Sparkles size={12} /> SUNO HOME</span>
          <h1>Good evening, {name || "there"}.</h1>
          <p>Pick something you love, add it to a room, and listen together.</p>
        </div>
        <div className="suno-dashboard-top-actions">
          <Link href="/search" className="suno-ghost-action"><Search size={15} /> Search</Link>
          <Link href="/upload" className="suno-primary-action"><UploadCloud size={15} /> Upload</Link>
        </div>
      </section>

      <section className="suno-dashboard-hero-grid">
        <div className="suno-now-card">
          <div className="suno-now-card-bg" />
          <div className="suno-now-card-content">
            <div className="suno-section-overline"><Headphones size={13} /> YOUR MUSIC</div>
            <h2>{featured ? featured.title : "Your next song is waiting."}</h2>
            <p>{featured?.artist || "Build your library and start discovering music."}</p>

            <div className="suno-hero-discourse">
              <div className={`suno-feature-art bg-gradient-to-br ${gradients[0]}`}>
                <span>{featured?.title?.slice(0, 1)?.toUpperCase() || "S"}</span>
              </div>
              <div className="suno-wave-large" aria-hidden="true">
                {Array.from({ length: 28 }).map((_, i) => <i key={i} style={{ height: `${22 + ((i * 17) % 64)}%` }} />)}
              </div>
            </div>

            <div className="suno-now-actions">
              <Link href="/library" className="suno-light-button"><Play size={15} fill="currentColor" /> Open library</Link>
              <Link href="/rooms" className="suno-dark-button"><UsersRound size={15} /> Listen in a room</Link>
            </div>
          </div>
        </div>

        <div className="suno-dashboard-side-card">
          <div className="suno-dashboard-side-icon"><UsersRound size={18} /></div>
          <span className="suno-section-overline">LISTEN TOGETHER</span>
          <h3>Create a room and bring your people.</h3>
          <p>Share one code. Let everyone control the same listening session.</p>
          <Link href="/rooms" className="suno-inline-arrow">Explore rooms <ArrowRight size={14} /></Link>
        </div>
      </section>

      <section className="suno-quick-grid">
        <Link href="/rooms" className="suno-quick-card"><span><UsersRound size={17} /></span><div><strong>Create a room</strong><small>Start listening together</small></div><ArrowRight size={15} /></Link>
        <Link href="/search" className="suno-quick-card"><span><Search size={17} /></span><div><strong>Search music</strong><small>Find songs & artists</small></div><ArrowRight size={15} /></Link>
        <Link href="/upload" className="suno-quick-card"><span><Plus size={17} /></span><div><strong>Add your song</strong><small>Upload an MP3</small></div><ArrowRight size={15} /></Link>
      </section>

      <section className="suno-section-block">
        <div className="suno-section-heading-row">
          <div><span className="suno-section-overline">RECENTLY ADDED</span><h2>Fresh from your library.</h2></div>
          <Link href="/library" className="suno-section-link">See all <ArrowRight size={13} /></Link>
        </div>

        <div className="suno-recent-grid">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div className="suno-skeleton-card" key={i} />)
          ) : recent.length ? (
            recent.slice(0, 4).map((song, index) => (
              <button type="button" className={`suno-recent-card ${playingId === song.id ? "playing" : ""}`} key={song.id} onClick={() => setPlayingId((current) => current === song.id ? null : song.id)}>
                <div className={`suno-recent-art bg-gradient-to-br ${gradients[index % gradients.length]}`}><span>{song.title?.slice(0, 1)?.toUpperCase() || "S"}</span><i>{playingId === song.id ? "Ⅱ" : "▶"}</i></div>
                <div><p>{song.title}</p><small>{song.artist || "Unknown artist"}</small></div>
                <span className="suno-recent-duration">{formatDuration(song.durationSeconds)}</span>
              </button>
            ))
          ) : (
            <div className="suno-empty-inline"><LibraryBig size={17} /><div><strong>Your library is empty.</strong><span>Upload your first MP3 to start building your Suno space.</span></div><Link href="/upload">Upload <ArrowRight size={13} /></Link></div>
          )}
        </div>
      </section>

      <section className="suno-section-block">
        <div className="suno-section-heading-row"><div><span className="suno-section-overline">YOUR SPACE</span><h2>A few useful numbers.</h2></div></div>
        <div className="suno-stat-grid">
          <div className="suno-stat-card"><div><LibraryBig size={17} /></div><span>Tracks added</span><strong>{loading ? "—" : stats.total}</strong></div>
          <div className="suno-stat-card"><div><Clock3 size={17} /></div><span>Library minutes</span><strong>{loading ? "—" : stats.minutes}</strong></div>
          <div className="suno-stat-card"><div><UsersRound size={17} /></div><span>Room capacity</span><strong>10</strong></div>
          <div className="suno-stat-card"><div><Headphones size={17} /></div><span>Music source</span><strong>MP3</strong></div>
        </div>
      </section>

      <section className="suno-discovery-banner">
        <div className="suno-discovery-orb" />
        <div><span className="suno-section-overline">NEXT UP</span><h2>Find a song. Start a room.</h2><p>Search the shared library, choose a track, and bring your people in.</p></div>
        <Link href="/library" className="suno-light-button">Discover music <ArrowRight size={15} /></Link>
      </section>
    </div>
  );
}