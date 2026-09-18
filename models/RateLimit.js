import mongoose from "mongoose";

const RateLimitSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
    },
    windowStart: {
      type: Number,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    resetAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "rate_limits",
  },
);

RateLimitSchema.index({ key: 1, windowStart: 1 }, { unique: true });
RateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.RateLimit || mongoose.model("RateLimit", RateLimitSchema);