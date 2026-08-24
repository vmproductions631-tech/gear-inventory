"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { ItemStatus, Person, Rental } from "@/lib/types";

const field =
  "w-full rounded-lg border border-n300 bg-paper px-3 py-2.5 text-base";

const DESTS: { value: ItemStatus; label: string }[] = [
  { value: "with_owner", label: "With Owner" },
  { value: "with_operator", label: "With Operator" },
  { value: "with_crew", label: "With Crew…" },
  { value: "rented_out", label: "Rented Out…" },
];

export default function NewLoadoutPage() {
  const [name, setName] = useState("");
  const [dest, setDest] = useState<ItemStatus>("with_owner");
  const [personId, setPersonId] = useState("");
  const [rentalId, setRentalId] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { email } = useAuth();

  useEffect(() => {
    const sb = supabase();
    sb.from("people").select("*").order("name").then(({ data }) => setPeople(data ?? []));
    sb.from("rentals")
      .select("*")
      .is("date_returned", null)
      .order("date_out", { ascending: false })
      .then(({ data }) => setRentals(data ?? []));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (dest === "with_crew" && !personId) {
      setError("Pick the crew member this load-out goes to.");
      return;
    }
    if (dest === "rented_out" && !rentalId) {
      setError("Pick the rental this load-out belongs to.");
      return;
    }
    setBusy(true);
    const { data, error: err } = await supabase()
      .from("loadouts")
      .insert({
        name: name.trim() || null,
        destination_status: dest,
        person_id: dest === "with_crew" ? personId : null,
        rental_id: dest === "rented_out" ? rentalId : null,
        status: "draft",
        created_by: email,
      })
      .select("id")
      .single();
    setBusy(false);
    if (err || !data) {
      setError(err?.message ?? "Could not create load-out");
      return;
    }
    router.replace(`/loadouts/${data.id}`);
  }

  return (
    <Shell title="New Load-out" back="/loadouts">
      <form onSubmit={create} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-n600">
            Job name (optional)
          </label>
          <input
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spring Gala 5/12"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-n600">
            Where is this gear going?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DESTS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDest(d.value)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${
                  dest === d.value
                    ? "border-ink bg-ink text-paper"
                    : "border-n300 bg-paper"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        {dest === "with_crew" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-n600">
              Crew member
            </label>
            <select
              className={field}
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
            >
              <option value="">Choose…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {people.length === 0 && (
              <p className="mt-1 text-xs text-n500">
                No crew yet —{" "}
                <Link href="/people" className="underline">
                  add people first
                </Link>
                .
              </p>
            )}
          </div>
        )}
        {dest === "rented_out" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-n600">
              Rental
            </label>
            <select
              className={field}
              value={rentalId}
              onChange={(e) => setRentalId(e.target.value)}
            >
              <option value="">Choose…</option>
              {rentals.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.client_name} (due {r.date_due})
                </option>
              ))}
            </select>
            {rentals.length === 0 && (
              <p className="mt-1 text-xs text-n500">
                No open rentals —{" "}
                <Link href="/rentals/new" className="underline">
                  create the rental first
                </Link>
                .
              </p>
            )}
          </div>
        )}
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
          Start Scanning Gear →
        </button>
      </form>
    </Shell>
  );
}
