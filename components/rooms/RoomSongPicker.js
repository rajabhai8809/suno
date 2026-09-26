"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Music2, Search, X } from "lucide-react";

import { playerStore } from "@/lib/player/sunoPlayerStore";

export default function RoomSongPicker({ open, onClose, currentSongId }) {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "30",
          sort: "recent",
        });
        if (query.trim()) params.set("q", query.trim());

        const response = await fetch(`/api/songs/library?${params.toString()}`, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Unable to load songs.");
        }
        setSongs(Array.isArray(data.songs) ? data.songs : []);
      } catch (requestError) {
        if (requestError?.name !== "AbortError") {
          setError(requestError?.message || "Unable to load songs.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  if (!open) return null;

  async function chooseSong(song) {
    setPlayingId(song.id);
    setError("");
    try {
      await playerStore.play(song, songs);
      onClose?.();
    } catch (chooseError) {
      setError(chooseError?.message || "Unable to play that song.");
      setPlayingId(null);
    }
  }

  return (
    <div className="suno-room-song-picker" role="dialog" aria-label="Choose a shared song">
      <div className="suno-room-song-picker-head">
        <div>
          <p className="suno-section-overline">SHARED MUSIC</p>
          <h3>Choose a song for everyone.</h3>
        </div>
        <button type="button" className="suno-room-icon-action" onClick={onClose} aria-label="Close song picker">
          <X size={16} />
        </button>
      </div>

      <label className="suno-room-song-search">
        <Search size={15} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your shared library…"
          autoFocus
        />
      </label>

      {error ? <p className="suno-room-realtime-error">{error}</p> : null}

      <div className="suno-room-song-picker-list">
        {loading ? (
          <div className="suno-room-picker-state"><Loader2 size={20} className="animate-spin" /> Loading songs…</div>
        ) : songs.length === 0 ? (
          <div className="suno-room-picker-state"><Music2 size={20} /> No matching songs.</div>
        ) : (
          songs.map((song) => {
            const selected = String(song.id) === String(currentSongId);
            const busy = String(song.id) === String(playingId);
            return (
              <button
                key={song.id}
                type="button"
                className={`suno-room-song-option ${selected ? "selected" : ""}`}
                onClick={() => chooseSong(song)}
                disabled={busy}
              >
                <span className="suno-room-song-option-art"><Music2 size={15} /></span>
                <span className="suno-room-song-option-copy">
                  <strong>{song.title || "Untitled song"}</strong>
                  <small>{song.artist || "Unknown artist"}</small>
                </span>
                <span className="suno-room-song-option-state">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : selected ? <Check size={15} /> : null}
                </span>
              </button>
            );
          })
        )}
      </div>

      <p className="suno-room-song-picker-note">
        This action changes the room’s shared playback state for everyone connected.
      </p>
    </div>
  );
}