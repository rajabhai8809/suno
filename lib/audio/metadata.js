import crypto from "node:crypto";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { parseBuffer } from "music-metadata";

export const MAX_SONG_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_SONG_DURATION_SECONDS = 30 * 60;

const DISALLOWED_TITLE_PARTS = [
  "official video",
  "official audio",
  "official music video",
  "lyrics video",
  "lyric video",
  "lyrics",
  "music video",
  "full song",
  "audio song",
  "hd audio",
  "4k",
  "8k",
  "320kbps",
  "256kbps",
  "192kbps",
  "128kbps",
  "320 kbps",
  "256 kbps",
  "192 kbps",
  "128 kbps",
  "ytmusic",
  "yt mp3",
  "y2mate",
];

function removeExtension(filename) {
  return path.basename(filename, path.extname(filename));
}

export function cleanTitleFromFilename(filename) {
  let title = removeExtension(filename);

  title = title.replace(/[_.]+/g, " ");
  title = title.replace(/\s*[-|]+\s*/g, " - ");
  title = title.replace(/[\[\]{}]/g, " ");
  title = title.replace(/\(([^)]*)\)/gi, (full, inside) => {
    const normalized = inside.toLowerCase();

    const shouldRemove = DISALLOWED_TITLE_PARTS.some((part) =>
      normalized.includes(part),
    );

    return shouldRemove ? " " : ` (${inside})`;
  });

  for (const part of DISALLOWED_TITLE_PARTS) {
    const expression = new RegExp(`\\s*${escapeRegExp(part)}\\s*`, "gi");
    title = title.replace(expression, " ");
  }

  title = title.replace(/\s+-\s+/g, " - ");
  title = title.replace(/\s{2,}/g, " ");
  title = title.replace(/^[-–—\s]+|[-–—\s]+$/g, "");

  return title.trim().slice(0, 160) || "Untitled song";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function inspectMp3({ buffer, fileName }) {
  if (!buffer?.length) {
    throw new Error("The uploaded file is empty.");
  }

  if (buffer.length > MAX_SONG_SIZE_BYTES) {
    throw new Error("Song file is too large.");
  }

  const detectedType = await fileTypeFromBuffer(buffer);

  if (
    detectedType &&
    (detectedType.ext !== "mp3" || detectedType.mime !== "audio/mpeg")
  ) {
    throw new Error("Only valid MP3 audio files are supported.");
  }

  const metadata = await parseBuffer(
    buffer,
    {
      mimeType: "audio/mpeg",
      path: fileName,
      size: buffer.length,
    },
    {
      duration: true,
      skipCovers: true,
    },
  );

  const container = String(metadata.format?.container || "").toLowerCase();

  if (
    detectedType?.ext !== "mp3" &&
    !container.includes("mpeg") &&
    !container.includes("mp3")
  ) {
    throw new Error("The file does not contain valid MP3 audio.");
  }

  const durationSeconds = Number(metadata.format?.duration || 0);

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Could not read the song duration.");
  }

  if (durationSeconds > MAX_SONG_DURATION_SECONDS) {
    throw new Error("Song duration cannot be longer than 30 minutes.");
  }

  const common = metadata.common || {};

  const title = String(common.title || "").trim();
  const artist = String(common.artist || "").trim();
  const album = String(common.album || "").trim();

  return {
    mimeType: "audio/mpeg",
    extension: "mp3",
    size: buffer.length,
    durationSeconds: Math.round(durationSeconds * 100) / 100,
    title: title.slice(0, 160),
    artist: artist.slice(0, 160),
    album: album.slice(0, 160),
    fileHash: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}