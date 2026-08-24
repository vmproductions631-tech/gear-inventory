"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import StatusBadge from "@/components/StatusBadge";
import { OWNERS, STATUS_LABELS, money, ownerLabel } from "@/lib/constants";
import { isOverdue } from "@/lib/actions";
import { supabase } from "@/lib/supabase";
import type { Item, Person, Rental } from "@/lib/types";

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sb = supabase();
    Promise.all([
      sb.from("items").select("*"),
      sb.from("people").select("*"),
      sb.from("rentals").select("*"),
    ]).then(([i, p, r]) => {
      setItems(i.data ?? []);
      setPeople(p.data ?? []);
      setRentals(r.data ?? []);
      setLoaded(true);
    });
  }, []);

  const active = items.filter((i) => i.status !== "retired");
  const out = active.filter((i) => i.status !== "in_storage");
  const purchaseTotal = active.reduce((s, i) => s + (i.purchase_price ?? 0), 0);
  const replaceTotal = active.reduce(
    (s, i) => s + (i.replacement_value ?? 0),
    0
  );
  const overdueRentals = rentals.filter(isOverdue);
  const personName = (pid: string | null) =>
    people.find((p) => p.id === pid)?.name;
  const rentalName = (rid: string | null) =>
    rentals.find((r) => r.id === rid)?.client_name;

  const groups = out.reduce<Record<string, Item[]>>((acc, i) => {
    let key = STATUS_LABELS[i.status];
    if (i.status === "with_crew") {
      key = `With ${personName(i.assigned_person_id) ?? "crew"}`;
    } else if (i.status === "rented_out") {
      key = `Rented — ${rentalName(i.rental_id) ?? "client"}`;
    }
    (acc[key] ??= []).push(i);
    return acc;
  }, {});

  return (
    <Shell>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-paper p-3 text-center">
          <p className="text-2xl font-semibold">{active.length}</p>
          <p className="text-xs text-n500">Items</p>
        </div>
        <div className="rounded-xl bg-paper p-3 text-center">
          <p className="text-lg font-semibold">{money(replaceTotal)}</p>
          <p className="text-xs text-n500">Replacement</p>
        </div>
        <div className="rounded-xl bg-paper p-3 text-center">
          <p className="text-lg font-semibold">{money(purchaseTotal)}</p>
          <p className="text-xs text-n500">Purchase</p>
        </div>
      </div>

      <details className="mb-3 rounded-xl bg-paper p-3">
        <summary className="cursor-pointer text-sm font-medium text-n600">
          Value by owner
        </summary>
        <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
          {OWNERS.map((o) => {
            const owned = active.filter((i) => i.owner === o.value);
            const total = owned.reduce(
              (s, i) => s + (i.replacement_value ?? 0),
              0
            );
            return (
              <div key={o.value} className="contents">
                <dt className="text-n500">
                  {ownerLabel(o.value)} ({owned.length})
                </dt>
                <dd className="text-right">{money(total)}</dd>
              </div>
            );
          })}
        </dl>
      </details>

      {overdueRentals.length > 0 && (
        <div className="mb-3 rounded-xl border border-error bg-paper p-4">
          <h2 className="mb-2 text-sm text-error">Overdue Rentals</h2>
          <ul className="space-y-1">
            {overdueRentals.map((r) => (
              <li key={r.id}>
                <Link href={`/rentals/${r.id}`} className="text-sm font-medium">
                  {r.client_name}{" "}
                  <span className="text-xs text-error">due {r.date_due}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl bg-paper p-4">
        <h2 className="mb-2 text-sm">Out Right Now ({out.length})</h2>
        {loaded && out.length === 0 ? (
          <p className="text-sm text-n500">Everything&apos;s in storage. ✓</p>
        ) : (
          Object.entries(groups).map(([label, its]) => (
            <div key={label} className="mb-3 last:mb-0">
              <p className="mb-1 text-xs font-semibold text-n600">
                {label} ({its.length})
              </p>
              <ul className="space-y-1">
                {its.map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/items/${i.id}`}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">{i.name}</span>
                      <StatusBadge status={i.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {loaded && active.length === 0 && (
        <div className="mt-3 rounded-xl bg-ink p-6 text-center">
          <p className="mb-1 text-lg uppercase text-paper" style={{ fontFamily: "var(--font-display)" }}>
            Welcome to VMP Gear
          </p>
          <p className="mb-4 text-sm text-n300">
            Add your first item, print its label, and the inventory starts
            tracking itself.
          </p>
          <Link
            href="/items/new"
            className="inline-block rounded-lg bg-gold px-5 py-2.5 font-semibold text-ink"
          >
            Add First Item
          </Link>
        </div>
      )}
    </Shell>
  );
}
