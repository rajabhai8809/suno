import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 60,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      required: true,
    },
    image: {
      type: String,
      default: null,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },
    authProvider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
      index: true,
    },
    googleId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      select: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sessionVersion: {
      type: Number,
      default: 0,
    },
    failedLoginCount: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "users",
  },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);