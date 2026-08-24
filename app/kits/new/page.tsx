"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import PhotoInput from "@/components/PhotoInput";
import { supabase } from "@/lib/supabase";

const field =
  "w-full rounded-lg border border-n300 bg-paper px-3 py-2.5 text-base";

export default function NewKitPage() {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error: err } = await supabase()
      .from("kits")
      .insert({
        name: name.trim(),
        rental_rate: rate.trim() === "" ? null : Number(rate),
        notes: notes.trim() || null,
        photo_path: photo,
      })
      .select("id")
      .single();
    setBusy(false);
    if (err || !data) {
      setError(err?.message ?? "Save failed");
      return;
    }
    router.replace(`/kits/${data.id}`);
  }

  return (
    <Shell title="New Kit" back="/kits">
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-n600">
            Kit name *
          </label>
          <input
            required
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. A-Cam Package"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-n600">
            Kit rental rate $/day (its own rate — not a sum of items)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            className={field}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
        <PhotoInput value={photo} keyPrefix="kits" onChange={setPhoto} />
        <div>
          <label className="mb-1 block text-sm font-medium text-n600">
            Notes
          </label>
          <textarea
            className={field}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error && (
          <p className="rounded-lg bg-error/10 p-3 text-sm text-error">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-gold px-4 py-3 font-semibold text-ink disabled:opacity-60"
        >
          {busy ? "Saving…" : "Create Kit"}
        </button>
        <p className="text-center text-xs text-n400">
          Add items to the kit from each item&apos;s Edit page, or from the kit
          page after creating it.
        </p>
      </form>
    </Shell>
  );
}
