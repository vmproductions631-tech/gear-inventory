"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import StatusBadge from "@/components/StatusBadge";
import { CATEGORIES, OWNERS, STATUS_LABELS, money } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import Photo from "@/components/Photo";
import type { Item, Kit } from "@/lib/types";

const field =
  "rounded-lg border border-n300 bg-paper px-2.5 py-2 text-sm";

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [kitId, setKitId] = useState("");
  const [showRetired, setShowRetired] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sb = supabase();
    sb.from("items")
      .select("*")
      .order("name")
      .then(({ data }) => {
        setItems(data ?? []);
        setLoaded(true);
      });
    sb.from("kits")
      .select("*")
      .order("name")
      .then(({ data }) => setKits(data ?? []));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (!showRetired && i.status === "retired") return false;
      if (showRetired && i.status !== "retired") return false;
      if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (category && i.category !== category) return false;
      if (status && i.status !== status) return false;
      if (owner && i.owner !== owner) return false;
      if (kitId && i.kit_id !== kitId) return false;
      return true;
    });
  }, [items, q, category, status, owner, kitId, showRetired]);

  function exportCsv() {
    const cols = [
      "name",
      "category",
      "status",
      "owner",
      "purchase_price",
      "replacement_value",
      "rental_rate",
      "short_code",
      "notes",
    ] as const;
    const esc = (v: unknown) =>
      `"${String(v ?? "").replaceAll('"', '""')}"`;
    const rows = [
      cols.join(","),
      ...filtered.map((i) => cols.map((c) => esc(i[c])).join(",")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vmp-gear-inventory.csv";
    a.click();
  }

  return (
    <Shell title="Inventory">
      <div className="mb-3 flex gap-2">
        <input
          className={`${field} flex-1`}
          placeholder="Search gear…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Link
          href="/items/new"
          className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-ink"
        >
          + Add
        </Link>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS)
            .filter(([v]) => v !== "retired")
            .map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
        </select>
        <select className={field} value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">All owners</option>
          {OWNERS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select className={field} value={kitId} onChange={(e) => setKitId(e.target.value)}>
          <option value="">All kits</option>
          {kits.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowRetired(!showRetired)}
          className={`${field} ${showRetired ? "border-error text-error" : "text-n500"}`}
        >
          {showRetired ? "Showing retired" : "Retired"}
        </button>
      </div>
      {loaded && filtered.length === 0 ? (
        <p className="rounded-xl bg-paper p-6 text-center text-sm text-n500">
          {items.length === 0
            ? "No gear yet. Tap + Add to enter your first item."
            : "Nothing matches those filters."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((i) => (
            <li key={i.id}>
              <Link
                href={`/items/${i.id}`}
                className="flex items-center gap-3 rounded-xl bg-paper p-3"
              >
                <Photo
                  path={i.photo_path}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover"
                  placeholder={
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-n100 text-n400">
                      ▤
                    </div>
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.name}</p>
                  <StatusBadge status={i.status} />
                </div>
                <span className="text-sm text-n500">
                  {money(i.replacement_value)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={exportCsv}
        className="mt-4 w-full rounded-lg border border-n300 py-2 text-sm text-n500"
      >
        Export CSV ({filtered.length} items)
      </button>
    </Shell>
  );
}
