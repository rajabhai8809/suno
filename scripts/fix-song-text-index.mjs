import nextEnv from "@next/env";
import mongoose from "mongoose";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined.");
}

await mongoose.connect(uri);

const db = mongoose.connection.db;
const collection = db.collection("songs");

const indexes = await collection.listIndexes().toArray();
const existing = indexes.find((index) => index.name === "song_text_search");

if (existing) {
  console.log("[Suno] Found existing song_text_search index.");
  console.log("[Suno] Current language_override:", existing.language_override);
  console.log("[Suno] Current default_language:", existing.default_language);

  await collection.dropIndex("song_text_search");

  console.log("[Suno] Removed old song_text_search index.");
} else {
  console.log("[Suno] song_text_search index not found; creating it.");
}

await collection.createIndex(
  {
    title: "text",
    artist: "text",
    album: "text",
  },
  {
    name: "song_text_search",
    weights: {
      title: 8,
      artist: 5,
      album: 2,
    },
    // Do not interpret the user-facing `language` field as MongoDB's
    // per-document text language. "Hindi", "Bhojpuri", etc. are metadata.
    default_language: "none",
    language_override: "sunoTextLanguage",
  },
);

console.log("[Suno] Created production-safe multilingual song text index.");

await mongoose.disconnect();