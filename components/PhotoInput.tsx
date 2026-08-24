"use client";

import { useRef, useState } from "react";
import { deletePhoto, uploadPhoto } from "@/lib/photos";
import Photo from "./Photo";

/**
 * Photo picker + upload. Emits a storage PATH, not a URL — the bucket is
 * private. If the upload fails, the form can still save; the parent just gets
 * no path and shows the notice we surface here.
 */
export default function PhotoInput({
  value,
  keyPrefix,
  onChange,
}: {
  value: string | null;
  keyPrefix: string;
  onChange: (path: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paths uploaded during this edit. Only these are safe to delete on
  // remove/replace — a path that arrived as the initial value may still be
  // referenced by the saved record if the user cancels the form.
  const uploadedHere = useRef<Set<string>>(new Set());

  function discard(path: string | null) {
    if (path && uploadedHere.current.has(path)) {
      uploadedHere.current.delete(path);
      void deletePhoto(path);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const { path, error: err } = await uploadPhoto(file, keyPrefix);
    setBusy(false);
    if (err || !path) {
      setError(
        `Photo upload failed (${err}). You can save without it and add the photo later.`
      );
      return;
    }
    discard(value);
    uploadedHere.current.add(path);
    onChange(path);
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-n600">Photo</label>
      <Photo
        path={value}
        alt="Item photo"
        className="mb-2 h-40 w-full rounded-xl object-cover"
        placeholder={null}
      />
      <div className="flex items-center gap-3">
        <label className="cursor-pointer rounded-lg border border-n300 bg-paper px-3 py-2 text-sm font-medium">
          {busy ? "Uploading…" : "📷 Camera"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        <label className="cursor-pointer rounded-lg border border-n300 bg-paper px-3 py-2 text-sm font-medium">
          {busy ? "Uploading…" : "🖼 Gallery"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => {
              discard(value);
              onChange(null);
            }}
            className="text-sm text-n500 underline"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-warning">{error}</p>}
    </div>
  );
}
