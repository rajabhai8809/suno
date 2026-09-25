import "server-only";

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim();
const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

if (!url) {
  throw new Error("SUPABASE_URL is not configured.");
}

if (!secretKey) {
  throw new Error("SUPABASE_SECRET_KEY is not configured.");
}

export const supabaseAdmin = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export const SUNO_MUSIC_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() || "suno-music";