"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Shell from "@/components/Shell";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/components/AuthProvider";
import { isOverdue, setItemStatus, todayISO } from "@/lib/actions";
import { supabase } from "@/lib/supabase";
import type { Item, Rental } from "@/lib/types";

const field =
  "w-full rounded-lg border border-n300 bg-paper px-3 py-2.5 text-base";

export default function RentalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { email } = useAuth();
  const [rental, setRental] = useState<Rental | null>(null);
  const [out, setOut] = useState<Item[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    client_contact: "",
    date_out: "",
    date_due: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const { data: r } = await sb
      .from("rentals")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!r) return;
    setRental(r);
    setForm({
      client_name: r.client_name,
      client_contact: r.client_contact ?? "",
      date_out: r.date_out,
      date_due: r.date_due,
      notes: r.notes ?? "",
    });
    const { data: its } = await sb
      .from("items")
      .select("*")
      .eq("rental_id", id)
      .eq("status", "rented_out");
    setOut(its ?? []);
  }, [id]);

  // Fetch-on-mount. react-hooks/set-state-in-effect flags this because it can
  // trace setState into load(); the cascade it warns about (render -> effect ->
  // fetch -> setState -> render) is inherent to client-side data loading and is
  // only avoidable with Suspense or a server component. load() is also the manual
  // refresher called after every mutation, so it has to stay callable.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (!rental) {
    return (
      <Shell title="Rental" back="/rentals">
        <p className="p-6 text-center text-n500">Loading…</p>
      </Shell>
    );
  }

  const overdue = isOverdue(rental);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await supabase()
      .from("rentals")
      .update({
        client_name: form.client_name.trim(),
        client_contact: form.client_contact.trim() || null,
        date_out: form.date_out,
        date_due: form.date_due,
        notes: form.notes.trim() || null,
      })
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setEditing(false);
    load();
  }

  async function returnItem(it: Item) {
    await setItemStatus(it, "in_storage", email, {
      note: `returned from rental: ${rental!.client_name}`,
    });
    load();
  }

  async function markReturned() {
    if (out.length > 0) {
      if (
        !confirm(
          `${out.length} item(s) are still marked Rented Out on this rental. Mark them all back In Storage and close the rental?`
        )
      )
        return;
      for (const it of out) {
        await setItemStatus(it, "in_storage", email, {
          note: `returned from rental: ${rental!.client_name}`,
        });
      }
    }
    const { error: err } = await supabase()
      .from("rentals")
      .update({ date_returned: todayISO() })
      .eq("id", id);
    if (err) setError(err.message);
    load();
  }

  return (
    <Shell title={rental.client_name} back="/rentals">
      {overdue && (
        <p className="mb-3 rounded-lg bg-error p-3 text-sm font-semibold text-paper">
          OVERDUE — due back {rental.date_due}
          {out.length > 0
            ? `, ${out.length} item${out.length === 1 ? "" : "s"} still out`
            : ""}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-lg bg-error/10 p-3 text-sm text-error">
          {error}
        </p>
      )}

      {editing ? (
        <form onSubmit={saveEdit} className="mb-3 space-y-3 rounded-xl bg-paper p-4">
          <input
            required
            className={field}
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
          />
          <input
            className={field}
            placeholder="Contact"
            value={form.client_contact}
            onChange={(e) =>
              setForm({ ...form, client_contact: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              required
              className={field}
              value={form.date_out}
              onChange={(e) => setForm({ ...form, date_out: e.target.value })}
            />
            <input
              type="date"
              required
              className={field}
              value={form.date_due}
              onChange={(e) => setForm({ ...form, date_due: e.target.value })}
            />
          </div>
          <textarea
            className={field}
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-gold py-2.5 font-semibold text-ink"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-lg border border-n300 py-2.5"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-3 rounded-xl bg-paper p-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-n500">Contact</dt>
            <dd>{rental.client_contact ?? "—"}</dd>
            <dt className="text-n500">Out</dt>
            <dd>{rental.date_out}</dd>
            <dt className="text-n500">Due back</dt>
            <dd className={overdue ? "font-semibold text-error" : ""}>
              {rental.date_due}
            </dd>
            <dt className="text-n500">Returned</dt>
            <dd>{rental.date_returned ?? "not yet"}</dd>
          </dl>
          {rental.notes && (
            <p className="mt-2 text-sm text-n600">{rental.notes}</p>
          )}
          <button
            onClick={() => setEditing(true)}
            className="mt-3 w-full rounded-lg border border-n300 py-2 text-sm font-medium"
          >
            Edit Rental
          </button>
        </div>
      )}

      <div className="mb-3 rounded-xl bg-paper p-4">
        <h2 className="mb-2 text-sm">Gear on this rental ({out.length})</h2>
        {out.length === 0 ? (
          <p className="text-sm text-n500">
            No items currently out on this rental. Attach gear from an
            item&apos;s page (Rented Out…) or via a load-out.
          </p>
        ) : (
          <ul className="space-y-2">
            {out.map((i) => (
              <li key={i.id} className="flex items-center gap-2">
                <Link href={`/items/${i.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.name}</p>
                  <StatusBadge status={i.status} />
                </Link>
                <button
                  onClick={() => returnItem(i)}
                  className="rounded-lg border border-n300 px-2.5 py-1 text-xs font-medium"
                >
                  Returned
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!rental.date_returned && (
        <button
          onClick={markReturned}
          className="w-full rounded-lg bg-ink py-3 font-semibold text-paper"
        >
          Close Rental (all returned)
        </button>
      )}
    </Shell>
  );
}
