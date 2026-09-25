"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileAudio,
  Loader2,
  Music2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
  FileCheck2,
  Clock3,
} from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".mp3"];

function cleanFileTitle(filename) {
  const base = filename.replace(/\.mp3$/i, "");

  return base
    .replace(/[_.]+/g, " ")
    .replace(/[\[\]{}]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "--:--";

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);

  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(
    2,
    "0",
  )}`;
}

export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);

  const [metadata, setMetadata] = useState({
    title: "",
    artist: "",
    album: "",
  });

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function selectFile(nextFile) {
    setError("");
    setResult(null);

    if (!nextFile) return;

    const lowerName = nextFile.name.toLowerCase();

    const hasMp3Extension = ALLOWED_EXTENSIONS.some((ext) =>
      lowerName.endsWith(ext),
    );

    if (!hasMp3Extension) {
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
    if (status === "uploading" || status === "processing") {
      return;
    }

    setFile(null);
    setResult(null);
    setError("");

    setMetadata({
      title: "",
      artist: "",
      album: "",
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
      const initiateResponse = await fetch(
        "/api/songs/upload/initiate",
        {
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
          }),
        },
      );

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
          process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
            "suno-music",
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
          completeData.message ||
            "Unable to finalize the upload.",
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

  const busy =
    status === "uploading" ||
    status === "processing";

  return (
    <div className="suno-upload-page">
      {/* Header */}
      <div className="suno-upload-header">
        <div className="suno-upload-eyebrow">
          <Sparkles size={13} />
          Add to Suno
        </div>

        <h1>Upload a song.</h1>

        <p>
          Add an MP3 to the shared Suno library. You can add
          your own details or let Suno read the audio metadata.
        </p>
      </div>

      <form
        onSubmit={uploadSong}
        className="suno-upload-layout"
      >
        {/* LEFT — FILE */}
        <section className="suno-upload-panel">
          <div className="suno-panel-heading">
            <div>
              <span className="suno-panel-label">
                STEP 01
              </span>

              <h2>Your audio</h2>
            </div>

            <span className="suno-panel-badge">
              MP3
            </span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".mp3,audio/mpeg"
            className="sr-only"
            onChange={(event) =>
              selectFile(event.target.files?.[0])
            }
            disabled={busy}
          />

          {!file ? (
            <button
              type="button"
              onClick={() =>
                inputRef.current?.click()
              }
              disabled={busy}
              className="suno-dropzone"
            >
              <span className="suno-dropzone-icon">
                <UploadCloud size={24} />
              </span>

              <span className="suno-dropzone-title">
                Choose an MP3
              </span>

              <span className="suno-dropzone-description">
                Select a song from your device.
              </span>

              <span className="suno-dropzone-hint">
                MP3 · Maximum 25 MB
              </span>
            </button>
          ) : (
            <div className="suno-file-preview">
              <div className="suno-file-header">
                <div className="suno-file-main">
                  <div className="suno-file-icon">
                    <FileAudio size={21} />
                  </div>

                  <div className="suno-file-info">
                    <p title={file.name}>
                      {file.name}
                    </p>

                    <span>
                      {formatBytes(file.size)} · MP3
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={busy}
                  aria-label="Remove selected file"
                  className="suno-remove-button"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Artist visual */}
              <div className="suno-audio-stage">
                <div className="suno-audio-orbit suno-audio-orbit-one" />
                <div className="suno-audio-orbit suno-audio-orbit-two" />

                <div className="suno-audio-disc">
                  <div className="suno-audio-disc-lines" />

                  <div className="suno-audio-disc-center">
                    <Music2 size={27} />
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="suno-upload-progress">
                <div className="suno-progress-header">
                  <span>
                    {status === "processing"
                      ? "Verifying audio"
                      : status === "success"
                        ? "Ready"
                        : "Ready to upload"}
                  </span>

                  <span>{progress}%</span>
                </div>

                <div className="suno-progress-track">
                  <div
                    className="suno-progress-value"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>

              {/* Info badges */}
              <div className="suno-file-meta-grid">
                <div>
                  <FileCheck2 size={14} />
                  <span>MP3 verified</span>
                </div>

                <div>
                  <Clock3 size={14} />
                  <span>Server checked</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT — DETAILS */}
        <section className="suno-upload-panel suno-details-panel">
          <div className="suno-panel-heading">
            <div>
              <span className="suno-panel-label">
                STEP 02
              </span>

              <h2>Song details</h2>
            </div>

            <span className="suno-panel-badge">
              OPTIONAL
            </span>
          </div>

          <div className="suno-fields">
            <label>
              <span>Title</span>

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
              />
            </label>

            <label>
              <span>Artist</span>

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
              />
            </label>

            <label>
              <span>Album</span>

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
              />
            </label>
          </div>

          <div className="suno-security-note">
            <div className="suno-security-icon">
              <ShieldCheck size={17} />
            </div>

            <div>
              <p>Protected upload</p>

              <span>
                Suno verifies the actual audio file on the
                server before it becomes available in the
                library.
              </span>
            </div>
          </div>

          {error && (
            <div className="suno-error-box">
              <AlertCircle size={16} />

              <span>{error}</span>
            </div>
          )}

          {status === "success" && result && (
            <div className="suno-success-box">
              <CheckCircle2 size={17} />

              <div>
                <p>Song uploaded successfully.</p>

                <span>
                  {result.title}
                  {result.artist
                    ? ` · ${result.artist}`
                    : ""}
                  {Number.isFinite(
                    result.durationSeconds,
                  )
                    ? ` · ${formatDuration(
                        result.durationSeconds,
                      )}`
                    : ""}
                </span>
              </div>
            </div>
          )}

          {status === "success" ? (
            <button
              type="button"
              onClick={() => {
                clearSelection();
                router.refresh();
              }}
              className="suno-submit-button"
            >
              Upload another MP3
              <UploadCloud size={17} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!file || busy}
              className="suno-submit-button"
            >
              {busy ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  {status === "processing"
                    ? "Verifying song..."
                    : `Uploading ${progress}%`}
                </>
              ) : (
                <>
                  Upload to Suno
                  <UploadCloud size={17} />
                </>
              )}
            </button>
          )}

          <div className="suno-bottom-note">
            <span>PRIVATE STORAGE</span>
            <span>SHA-256 VERIFIED</span>
            <span>25 MB MAX</span>
          </div>
        </section>
      </form>
    </div>
  );
}