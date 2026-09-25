import mongoose from "mongoose";

const SongSchema = new mongoose.Schema(
  {
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      required: true,
      minlength: 1,
      maxlength: 160,
    },

    artist: {
      type: String,
      trim: true,
      default: "Unknown artist",
      maxlength: 160,
    },

    album: {
      type: String,
      trim: true,
      default: null,
      maxlength: 160,
    },

    originalFilename: {
      type: String,
      trim: true,
      required: true,
      maxlength: 255,
    },

    storagePath: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },

    fileHash: {
      type: String,
      required: true,
      select: false,
    },

    mimeType: {
      type: String,
      enum: ["audio/mpeg"],
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },

    durationSeconds: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["uploading", "processing", "ready", "failed"],
      default: "uploading",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    uploadExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "songs",
  },
);

SongSchema.index({ uploaderId: 1, fileHash: 1 }, { unique: true });
SongSchema.index({ status: 1, isActive: 1, createdAt: -1 });
SongSchema.index({ artist: 1, title: 1 });
SongSchema.index({ uploaderId: 1, createdAt: -1 });

SongSchema.index(
  { title: "text", artist: "text", album: "text" },
  {
    name: "song_text_search",
    weights: {
      title: 8,
      artist: 5,
      album: 2,
    },
  },
);

export default mongoose.models.Song || mongoose.model("Song", SongSchema);