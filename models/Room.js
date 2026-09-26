import mongoose from "mongoose";

const RoomMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["creator", "member"],
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const PlaybackSchema = new mongoose.Schema(
  {
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Song",
      default: null,
    },
    queueItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    isPlaying: {
      type: Boolean,
      default: false,
    },
    positionSeconds: {
      type: Number,
      default: 0,
      min: 0,
      max: 24 * 60 * 60,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    revision: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false },
);

const QueueItemSchema = new mongoose.Schema(
  {
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Song",
      required: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const QueueSchema = new mongoose.Schema(
  {
    items: {
      type: [QueueItemSchema],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length <= 100;
        },
        message: "A room queue can contain at most 100 songs.",
      },
    },
    currentItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    revision: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const RoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      minlength: 1,
      maxlength: 80,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    codeCiphertext: {
      type: String,
      required: true,
      select: false,
    },
    maxMembers: {
      type: Number,
      default: 10,
      min: 2,
      max: 10,
      immutable: true,
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
    members: {
      type: [RoomMemberSchema],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length >= 1 && value.length <= 10;
        },
        message: "A room must have between 1 and 10 members.",
      },
      required: true,
    },
    playback: {
      type: PlaybackSchema,
      default: () => ({}),
    },
    queue: {
      type: QueueSchema,
      default: () => ({}),
    },
    stateRevision: {
      type: Number,
      default: 0,
      min: 0,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "rooms",
  },
);

RoomSchema.index({ creatorId: 1, status: 1, updatedAt: -1 });
RoomSchema.index({ "members.userId": 1, status: 1, updatedAt: -1 });
RoomSchema.index({ status: 1, updatedAt: -1 });
RoomSchema.index({ "playback.songId": 1, status: 1 });
RoomSchema.index({ "queue.items.songId": 1, status: 1 });

export default mongoose.models.Room || mongoose.model("Room", RoomSchema);