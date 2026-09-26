#!/usr/bin/env node

/**
 * Suno Phase 10 — production release preflight.
 *
 * This script is intentionally dependency-free and does not print secret
 * values. Run from the project root:
 *
 *   node scripts/phase10-release-check.mjs
 *
 * For CI/production preflight, set:
 *
 *   STRICT_ENV=true node scripts/phase10-release-check.mjs
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const strictEnv = process.env.STRICT_ENV === "true";
const failures = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function requireFile(relativePath) {
  if (!exists(relativePath)) {
    failures.push(`Missing required file: ${relativePath}`);
  }
}

function envPresent(name) {
  return Boolean(String(process.env[name] || "").trim());
}

function requiredEnv(name) {
  if (!envPresent(name)) failures.push(`Missing environment variable: ${name}`);
}

function optionalEnv(name) {
  if (!envPresent(name)) warnings.push(`Optional environment variable is not set: ${name}`);
}

const requiredFiles = [
  "package.json",
  "package-lock.json",
  "server.mjs",
  "server/realtime.mjs",
  "next.config.mjs",
  "app/api/health/route.js",
  "auth.js",
  "proxy.js",
  "lib/db/mongodb.js",
  "models/Song.js",
  "models/Room.js",
  "lib/player/sunoPlayerStore.js",
  "lib/realtime/useSunoRoomRealtime.js",
];

for (const file of requiredFiles) requireFile(file);

const packageJsonPath = path.join(root, "package.json");

if (exists("package.json")) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const scripts = pkg.scripts || {};

    if (scripts.build !== "next build") {
      warnings.push(`package.json build script is "${scripts.build || "missing"}"; expected "next build".`);
    }

    if (!scripts.start || !scripts.start.includes("server.mjs")) {
      failures.push('package.json start script must launch the custom server.mjs for Socket.IO rooms.');
    }

    if (!scripts.dev || !scripts.dev.includes("server.mjs")) {
      warnings.push('package.json dev script does not appear to launch server.mjs.');
    }
  } catch {
    failures.push("package.json is not valid JSON.");
  }
}

if (strictEnv || process.env.NODE_ENV === "production") {
  requiredEnv("MONGODB_URI");
  requiredEnv("AUTH_SECRET");
  requiredEnv("SUPABASE_URL");
  requiredEnv("SUPABASE_SECRET_KEY");
  requiredEnv("SUPABASE_STORAGE_BUCKET");
  requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  requiredEnv("NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET");

  optionalEnv("AUTH_URL");
  optionalEnv("NEXT_PUBLIC_APP_URL");
  optionalEnv("CORS_ORIGINS");
}

if (envPresent("AUTH_DEBUG") && process.env.AUTH_DEBUG === "true") {
  failures.push("AUTH_DEBUG=true should not be enabled for production.");
}

if (envPresent("NODE_ENV") && process.env.NODE_ENV === "production") {
  if (String(process.env.AUTH_TRUST_HOST || "").toLowerCase() !== "true") {
    warnings.push("AUTH_TRUST_HOST is not explicitly true; verify your Auth.js host configuration.");
  }

  if (!envPresent("CORS_ORIGINS")) {
    warnings.push("CORS_ORIGINS is not set; verify realtime origin policy before deployment.");
  }
}

const localEnv = [".env.local", ".env", ".env.production"].filter(exists);

if (localEnv.length === 0) {
  warnings.push("No local env file is present; that is fine for CI/container deployments using injected environment variables.");
}

console.log("\n[Suno] Phase 10 release preflight");
console.log("─".repeat(42));

if (failures.length) {
  console.log("\nFAIL");
  for (const message of failures) console.log(`  ✗ ${message}`);
}

if (warnings.length) {
  console.log("\nWARNINGS");
  for (const message of warnings) console.log(`  ! ${message}`);
}

if (!failures.length && !warnings.length) {
  console.log("PASS — release preflight checks passed.");
} else if (!failures.length) {
  console.log("\nPASS WITH WARNINGS — review the items above before production deploy.");
}

console.log("");

process.exitCode = failures.length ? 1 : 0;