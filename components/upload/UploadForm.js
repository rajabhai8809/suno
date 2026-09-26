"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FileAudio,
  Loader2,
  Music2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UsersRound,
  X,
} from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".mp3"];

const genres = [
  "Pop",
  "Bollywood",
  "Hip-Hop",
  "Indie",
  "Rock",
  "Lo-fi",
  "Electronic",
  "Classical",
  "Devotional",
  "R&B",
  "Jazz",
  "Folk",
  "Other",
];

const languages = [
  "Hindi",
  "English",
  "Punjabi",
  "Bengali",
  "Tamil",
  "Telugu",
  "Urdu",
  "Marathi",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Odia",
  "Assamese",
  "Other",
];

function cleanFileTitle(filename) {
  return filename
    .replace(/\.mp3$/i, "")
    .replace(/[_.]+/g, " ")
    .replace(/[\[\]{}]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const inputClassName =
  "h-12 w-full min-w-0 rounded-2xl border border-white/[0.08] bg-black/20 px-3.5 text-sm text-white outline-none transition placeholder:text-white/15 hover:border-white/[0.13] focus:border-violet-300/30 focus:bg-white/[0.025] focus:ring-4 focus:ring-violet-300/[0.04] disabled:cursor-not-allowed disabled:opacity-45";

const labelClassName =
  "mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30";

export default function UploadForm() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState({
    title: "",
    artist: "",
    album: "",
    genre: "Other",
    language: "Unknown",
  });

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function selectFile(nextFile) {
    setError("");
    setResult(null);

    if (!nextFile) return;

    const isMp3 =
      nextFile.type === "audio/mpeg" ||
      ALLOWED_EXTENSIONS.some((ext) =>
        nextFile.name.toLowerCase().endsWith(ext),
      );

    if (!isMp3) {
      setFile(null);
      setError("Only MP3 files are allowed.");
      return;
    }

    if (nextFile.size <= 0) {
      setFile(null);
      setError("This file is empty.");
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("Maximum file size is 25 MB.");
      return;
    }

    setFile(nextFile);

    setMetadata((current) => ({
      ...current,
      title: current.title || cleanFileTitle(nextFile.name),
    }));
  }

  function clearSelection() {
    if (status === "uploading" || status === "processing") return;

    setFile(null);
    setResult(null);
    setError("");
    setProgress(0);

    setMetadata({
      title: "",
      artist: "",
      album: "",
      genre: "Other",
      language: "Unknown",
    });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function uploadSong(event) {
    event.preventDefault();

    if (!file) {
      setError("Select an MP3 file first.");
      return;
    }

    setError("");
    setResult(null);
    setStatus("uploading");
    setProgress(8);

    let uploadId = null;

    try {
      const initiateResponse = await fetch("/api/songs/upload/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "audio/mpeg",
          title: metadata.title.trim(),
          artist: metadata.artist.trim(),
          album: metadata.album.trim(),
          genre: metadata.genre.trim(),
          language: metadata.language.trim(),
        }),
      });

      const initiateData = await initiateResponse.json();

      if (!initiateResponse.ok || !initiateData.success) {
        throw new Error(
          initiateData.message || "Unable to start the upload.",
        );
      }

      uploadId = initiateData.uploadId;
      setProgress(18);

      const supabase = getSupabaseBrowserClient();

      const { error: uploadError } = await supabase.storage
        .from(
          process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "suno-music",
        )
        .uploadToSignedUrl(
          initiateData.path,
          initiateData.token,
          file,
          {
            contentType: "audio/mpeg",
          },
        );

      if (uploadError) {
        throw uploadError;
      }

      setProgress(72);
      setStatus("processing");

      const completeResponse = await fetch(
        "/api/songs/upload/complete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            uploadId,
          }),
        },
      );

      const completeData = await completeResponse.json();

      if (!completeResponse.ok || !completeData.success) {
        throw new Error(
          completeData.message || "Unable to finalize the upload.",
        );
      }

      setProgress(100);
      setResult(completeData.song);
      setStatus("success");
    } catch (uploadError) {
      console.error("[Suno] Upload failed:", uploadError);

      if (uploadId) {
        await fetch("/api/songs/upload/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            uploadId,
          }),
        }).catch(() => null);
      }

      setStatus("error");
      setProgress(0);
      setError(
        uploadError?.message ||
          "Something went wrong while uploading the song.",
      );
    }
  }

  const busy = status === "uploading" || status === "processing";

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1240px] pb-10 text-white">
      <div className="mb-7 min-w-0 max-w-3xl">
        <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-violet-300/10 bg-violet-300/[0.07] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-violet-200">
          <Sparkles className="h-3 w-3 shrink-0" />
          Add to Suno
        </span>

        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
          Upload music, keep it organised.
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40 sm:text-base">
          MP3s become searchable across Suno. Add genre and language once
          and they stay available as library filters.
        </p>
      </div>

      {status === "success" && result ? (
        <section className="mb-5 min-w-0 rounded-3xl border border-emerald-300/10 bg-emerald-300/[0.05] p-5 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Song added to Suno.
              </p>

              <p className="mt-1 truncate text-xs text-white/45">
                {result.title} · {result.artist}
              </p>

              <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                <Link
                  href="/my-uploads"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-xs font-semibold text-black"
                >
                  <Music2 className="h-3.5 w-3.5" />
                  Open my uploads
                </Link>

                <Link
                  href="/rooms"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 text-xs font-semibold text-white/60"
                >
                  <UsersRound className="h-3.5 w-3.5" />
                  Listen together
                </Link>

                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 text-xs font-semibold text-white/60"
                >
                  Upload another
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <form
        onSubmit={uploadSong}
        className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <section className="min-w-0 overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.025] p-4 sm:p-6">
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,audio/mpeg"
            className="sr-only"
            onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.target.value = "";
            }}
            disabled={busy}
          />

          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="group flex min-h-[310px] w-full min-w-0 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 px-6 text-center transition hover:border-violet-400/30 hover:bg-violet-400/[0.025] active:scale-[0.995]"
            >
              <span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-violet-300 transition group-hover:-translate-y-1">
                <UploadCloud className="h-6 w-6" />
              </span>

              <span className="mt-5 text-sm font-semibold">
                Choose an MP3
              </span>

              <span className="mt-2 max-w-md text-xs leading-5 text-white/25">
                Your file is uploaded directly to private storage, then
                verified on the server before it enters the shared library.
              </span>

              <span className="mt-4 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
                MP3 · Max 25 MB · 30 min
              </span>
            </button>
          ) : (
            <div className="min-w-0 rounded-[1.5rem] border border-white/[0.07] bg-black/10 p-4 sm:p-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-400 via-fuchsia-500 to-indigo-600 text-white">
                  <FileAudio className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-semibold text-white"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <p className="mt-1 text-[10px] text-white/25">
                    {formatBytes(file.size)} · MP3
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={busy}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/30 transition hover:border-white/20 hover:text-white disabled:opacity-30"
                  aria-label="Remove selected file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="my-10 grid place-items-center sm:my-12">
                <div className="grid aspect-square w-[min(52vw,11rem)] place-items-center rounded-[2rem] bg-gradient-to-br from-violet-400 via-fuchsia-500 to-cyan-400 p-px shadow-2xl shadow-violet-950/20 sm:w-44">
                  <div className="grid h-full w-full place-items-center rounded-[2rem] bg-[#0b0b10]">
                    <Music2 className="h-9 w-9 text-white/55" />
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
                  <span>
                    {status === "processing" ? "Processing" : "Ready"}
                  </span>
                  <span className="shrink-0">{progress}%</span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-[2rem] border border-white/[0.07] bg-white/[0.025] p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
              <Music2 className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold">Metadata</p>
              <p className="mt-1 text-[10px] text-white/25">
                Optional, but useful for search
              </p>
            </div>
          </div>

          <div className="mt-6 min-w-0 space-y-4">
            <label className="block min-w-0">
              <span className={labelClassName}>Title</span>
              <input
                value={metadata.title}
                onChange={(event) =>
                  setMetadata((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                disabled={busy}
                maxLength={160}
                placeholder="Song title"
                className={inputClassName}
              />
            </label>

            <label className="block min-w-0">
              <span className={labelClassName}>Artist</span>
              <input
                value={metadata.artist}
                onChange={(event) =>
                  setMetadata((current) => ({
                    ...current,
                    artist: event.target.value,
                  }))
                }
                disabled={busy}
                maxLength={160}
                placeholder="Artist name"
                className={inputClassName}
              />
            </label>

            <label className="block min-w-0">
              <span className={labelClassName}>Album</span>
              <input
                value={metadata.album}
                onChange={(event) =>
                  setMetadata((current) => ({
                    ...current,
                    album: event.target.value,
                  }))
                }
                disabled={busy}
                maxLength={160}
                placeholder="Album name"
                className={inputClassName}
              />
            </label>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block min-w-0">
                <span className={labelClassName}>Genre</span>
                <select
                  value={metadata.genre}
                  onChange={(event) =>
                    setMetadata((current) => ({
                      ...current,
                      genre: event.target.value,
                    }))
                  }
                  disabled={busy}
                  className={inputClassName}
                >
                  {genres.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-0">
                <span className={labelClassName}>Language</span>
                <select
                  value={metadata.language}
                  onChange={(event) =>
                    setMetadata((current) => ({
                      ...current,
                      language: event.target.value,
                    }))
                  }
                  disabled={busy}
                  className={inputClassName}
                >
                  <option value="Unknown">Unknown</option>
                  {languages.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex min-w-0 items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] leading-5 text-white/30">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300/70" />
              <span className="min-w-0">
                Private storage, server-side MP3 verification and duplicate
                protection remain unchanged.
              </span>
            </div>

            {error ? (
              <div className="flex min-w-0 items-start gap-2 rounded-2xl border border-red-300/10 bg-red-300/[0.05] p-3 text-xs leading-5 text-red-100/75">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy || !file}
              className="inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-violet-50 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span className="truncate">
                    {status === "processing"
                      ? "Verifying MP3…"
                      : "Uploading…"}
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    Add to shared library
                  </span>
                </>
              )}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}