"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { isOverdue } from "@/lib/actions";
import { supabase } from "@/lib/supabase";
import type { Item, Rental } from "@/lib/types";

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sb = supabase();
    Promise.all([
      sb.from("rentals").select("*").order("date_out", { ascending: false }),
      sb.from("items").select("*").eq("status", "rented_out"),
    ]).then(([r, i]) => {
      setRentals(r.data ?? []);
      setItems(i.data ?? []);
      setLoaded(true);
    });
  }, []);

  const open = rentals.filter((r) => !r.date_returned);
  const closed = rentals.filter((r) => r.date_returned);

  function card(r: Rental) {
    const out = items.filter((i) => i.rental_id === r.id);
    const overdue = isOverdue(r);
    return (
      <li key={r.id}>
        <Link
          href={`/rentals/${r.id}`}
          className={`block rounded-xl bg-paper p-3 ${overdue ? "border border-error" : ""}`}
        >
          <div className="flex items-center justify-between">
            <p className="font-medium">{r.client_name}</p>
            {overdue && (
              <span className="rounded-full bg-error px-2 py-0.5 text-xs font-semibold text-paper">
                OVERDUE
              </span>
            )}
          </div>
          <p className="text-xs text-n500">
            Out {r.date_out} · due {r.date_due}
            {r.date_returned ? ` · returned ${r.date_returned}` : ""}
            {out.length > 0 ? ` · ${out.length} item${out.length === 1 ? "" : "s"} out` : ""}
          </p>
        </Link>
      </li>
    );
  }

  return (
    <Shell title="Rentals" back="/more">
      <div className="mb-3 flex justify-end">
        <Link
          href="/rentals/new"
          className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-ink"
        >
          + New Rental
        </Link>
      </div>
      {loaded && rentals.length === 0 && (
        <p className="rounded-xl bg-paper p-6 text-center text-sm text-n500">
          No rentals yet. A rental tracks gear that leaves with a client — who
          has it, when it left, when it&apos;s due back. Invoicing stays in the
          billing system.
        </p>
      )}
      {open.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-sm text-n500">Open</h2>
          <ul className="space-y-2">{open.map(card)}</ul>
        </section>
      )}
      {closed.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm text-n500">Returned</h2>
          <ul className="space-y-2">{closed.map(card)}</ul>
        </section>
      )}
    </Shell>
  );
}
