import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim();
const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "suno-music";

if (!url || !secretKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SECRET_KEY are required.",
  );
}

const supabase = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const options = {
  public: false,
  allowedMimeTypes: ["audio/mpeg"],
  fileSizeLimit: "25MB",
};

const { data: existing, error: listError } =
  await supabase.storage.listBuckets();

if (listError) {
  throw listError;
}

const found = existing?.find((item) => item.id === bucket);

if (!found) {
  const { error } = await supabase.storage.createBucket(bucket, options);

  if (error) throw error;

  console.log(`✅ Created private bucket: ${bucket}`);
} else {
  const { error } = await supabase.storage.updateBucket(bucket, options);

  if (error) throw error;

  console.log(`✅ Updated private bucket: ${bucket}`);
}