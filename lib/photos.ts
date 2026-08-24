import imageCompression from "browser-image-compression";
import { supabase } from "./supabase";

const BUCKET = "photos";

/** Signed URL lifetime. Long enough for a working session, short enough that a
 *  leaked link stops working the same day. */
const SIGN_TTL_SECONDS = 60 * 60;

/** Re-sign a little before the URL actually dies, so a cached hit is never
 *  handed out moments before it expires. */
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Compress (target ~500 KB) and upload a photo to the private `photos` bucket.
 * Returns the storage PATH, not a URL — the bucket is private, so URLs are
 * signed on demand and expire. Persist the path; never persist a signed URL.
 */
export async function uploadPhoto(
  file: File,
  keyPrefix: string
): Promise<{ path: string | null; error: string | null }> {
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    });
    const path = `${keyPrefix}/${Date.now()}.jpg`;
    const { error } = await supabase()
      .storage.from(BUCKET)
      .upload(path, compressed, { contentType: "image/jpeg", upsert: true });
    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch (e) {
    return {
      path: null,
      error: e instanceof Error ? e.message : "upload failed",
    };
  }
}

/** Remove a photo. Fire-and-forget: a failed delete is not worth blocking a save. */
export async function deletePhoto(path: string): Promise<void> {
  cache.delete(path);
  await supabase().storage.from(BUCKET).remove([path]);
}

// --- signing -------------------------------------------------------------
//
// Every photo on a list page needs a signed URL, and signing is a network
// call. Requests made in the same tick are collected into one batch call, and
// results are cached for the rest of the session, so rendering fifty items
// costs one request rather than fifty.

interface CacheEntry {
  url: string;
  at: number;
}

const cache = new Map<string, CacheEntry>();

interface Job {
  path: string;
  resolve: (url: string | null) => void;
}

let queue: Job[] = [];
let scheduled = false;

async function flush() {
  scheduled = false;
  const jobs = queue;
  queue = [];
  const paths = [...new Set(jobs.map((j) => j.path))];

  const resolved = new Map<string, string>();
  try {
    const { data } = await supabase()
      .storage.from(BUCKET)
      .createSignedUrls(paths, SIGN_TTL_SECONDS);
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) {
        resolved.set(row.path, row.signedUrl);
        cache.set(row.path, { url: row.signedUrl, at: Date.now() });
      }
    }
  } catch {
    // Leave resolved empty — every job below gets null and renders a
    // placeholder. A missing thumbnail must never break the page.
  }

  for (const job of jobs) job.resolve(resolved.get(job.path) ?? null);
}

/**
 * Resolve a storage path to a temporary signed URL, or null if it cannot be
 * signed (deleted file, expired session, offline).
 */
export function signPhoto(path: string): Promise<string | null> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return Promise.resolve(hit.url);
  }
  return new Promise((resolve) => {
    queue.push({ path, resolve });
    if (!scheduled) {
      scheduled = true;
      setTimeout(flush, 0);
    }
  });
}
