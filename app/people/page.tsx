"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/lib/supabase";
import type { Item, Person } from "@/lib/types";

const field =
  "w-full rounded-lg border border-n300 bg-paper px-3 py-2.5 text-base";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState<Person | "new" | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const [{ data: ppl }, { data: its }] = await Promise.all([
      sb.from("people").select("*").order("name"),
      sb.from("items").select("*").eq("status", "with_crew"),
    ]);
    setPeople(ppl ?? []);
    setItems(its ?? []);
  }, []);

  // Fetch-on-mount. react-hooks/set-state-in-effect flags this because it can
  // trace setState into load(); the cascade it warns about (render -> effect ->
  // fetch -> setState -> render) is inherent to client-side data loading and is
  // only avoidable with Suspense or a server component. load() is also the manual
  // refresher called after every mutation, so it has to stay callable.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function startEdit(p: Person | "new") {
    setEditing(p);
    setName(p === "new" ? "" : p.name);
    setPhone(p === "new" ? "" : (p.phone ?? ""));
    setEmail(p === "new" ? "" : (p.email ?? ""));
    setNotes(p === "new" ? "" : (p.notes ?? ""));
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabase();
    const row = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
    };
    const { error: err } =
      editing === "new"
        ? await sb.from("people").insert(row)
        : await sb.from("people").update(row).eq("id", (editing as Person).id);
    if (err) {
      setError(err.message);
      return;
    }
    setEditing(null);
    load();
  }

  return (
    <Shell title="Crew" back="/more">
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => startEdit("new")}
          className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-ink"
        >
          + Add Person
        </button>
      </div>

      {editing && (
        <form onSubmit={save} className="mb-3 space-y-3 rounded-xl bg-paper p-4">
          <input
            required
            className={field}
            placeholder="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={field}
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className={field}
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={field}
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {error && (
            <p className="rounded-lg bg-error/10 p-3 text-sm text-error">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-gold py-2.5 font-semibold text-ink"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="flex-1 rounded-lg border border-n300 py-2.5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {people.length === 0 && !editing ? (
        <p className="rounded-xl bg-paper p-6 text-center text-sm text-n500">
          No crew yet. Add the people who take gear — Denis, Rebekah, Ryan…
        </p>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => {
            const holding = items.filter((i) => i.assigned_person_id === p.id);
            return (
              <li key={p.id} className="rounded-xl bg-paper p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{p.name}</p>
                  <button
                    onClick={() => startEdit(p)}
                    className="text-xs text-n400 underline"
                  >
                    Edit
                  </button>
                </div>
                {(p.phone || p.email) && (
                  <p className="text-xs text-n500">
                    {[p.phone, p.email].filter(Boolean).join(" · ")}
                  </p>
                )}
                {holding.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-n600">
                      Currently holding {holding.length} item
                      {holding.length === 1 ? "" : "s"}:
                    </p>
                    {holding.map((i) => (
                      <Link
                        key={i.id}
                        href={`/items/${i.id}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="truncate">{i.name}</span>
                        <StatusBadge status={i.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
