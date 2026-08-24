"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { todayISO } from "@/lib/actions";
import { supabase } from "@/lib/supabase";

const field =
  "w-full rounded-lg border border-n300 bg-paper px-3 py-2.5 text-base";
const label = "mb-1 block text-sm font-medium text-n600";

export default function NewRentalPage() {
  const [client, setClient] = useState("");
  const [contact, setContact] = useState("");
  const [dateOut, setDateOut] = useState(todayISO());
  const [dateDue, setDateDue] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error: err } = await supabase()
      .from("rentals")
      .insert({
        client_name: client.trim(),
        client_contact: contact.trim() || null,
        date_out: dateOut,
        date_due: dateDue,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (err || !data) {
      setError(err?.message ?? "Save failed");
      return;
    }
    router.replace(`/rentals/${data.id}`);
  }

  return (
    <Shell title="New Rental" back="/rentals">
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className={label}>Client *</label>
          <input
            required
            className={field}
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Who's taking the gear"
          />
        </div>
        <div>
          <label className={label}>Contact (phone/email)</label>
          <input
            className={field}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Date out *</label>
            <input
              type="date"
              required
              className={field}
              value={dateOut}
              onChange={(e) => setDateOut(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Due back *</label>
            <input
              type="date"
              required
              className={field}
              value={dateDue}
              onChange={(e) => setDateDue(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className={label}>Notes</label>
          <textarea
            className={field}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Logistics only — invoicing lives in the billing system"
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
          {busy ? "Saving…" : "Create Rental"}
        </button>
      </form>
    </Shell>
  );
}
