#!/usr/bin/env node

/**
 * Suno Phase 10 — HTTP smoke test.
 *
 * Usage:
 *   node scripts/phase10-smoke.mjs
 *   BASE_URL=http://127.0.0.1:3000 node scripts/phase10-smoke.mjs
 *
 * This checks unauthenticated public/protected boundaries only. It never
 * requires or prints credentials.
 */

import process from "node:process";

const baseUrl = String(process.env.BASE_URL || "http://127.0.0.1:3000")
  .trim()
  .replace(/\/+$/, "");

const checks = [
  { name: "Health", path: "/api/health", expected: [200] },
  { name: "Login", path: "/login", expected: [200] },
  { name: "Register", path: "/register", expected: [200] },
  { name: "Protected dashboard", path: "/dashboard", expected: [200, 307, 308] },
  { name: "Protected rooms", path: "/rooms", expected: [200, 307, 308] },
  { name: "Protected library API", path: "/api/songs/library", expected: [401] },
  { name: "Protected rooms API", path: "/api/rooms", expected: [401] },
];

let failures = 0;

async function check(item) {
  const url = `${baseUrl}${item.path}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "application/json, text/html;q=0.9, */*;q=0.8",
        "User-Agent": "Suno-Phase10-Smoke/1.0",
      },
    });

    const ok = item.expected.includes(response.status);

    console.log(
      `${ok ? "PASS" : "FAIL"}  ${item.name.padEnd(24)} ${response.status}  ${item.path}`,
    );

    if (!ok) failures += 1;
  } catch (error) {
    failures += 1;
    console.log(
      `FAIL  ${item.name.padEnd(24)} ${error?.message || "request failed"}  ${item.path}`,
    );
  }
}

console.log(`\n[Suno] Phase 10 smoke test → ${baseUrl}`);
console.log("─".repeat(72));

for (const item of checks) {
  await check(item);
}

console.log("");

if (failures) {
  console.log(`[Suno] Smoke test failed: ${failures} check(s).`);
  process.exitCode = 1;
} else {
  console.log("[Suno] Smoke test passed.");
}