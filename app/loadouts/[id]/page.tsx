"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Shell from "@/components/Shell";
import Scanner from "@/components/Scanner";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/components/AuthProvider";
import { STATUS_LABELS } from "@/lib/constants";
import { setItemStatus } from "@/lib/actions";
import { supabase } from "@/lib/supabase";
import type {
  Item,
  Kit,
  Loadout,
  LoadoutItem,
  Person,
  Rental,
} from "@/lib/types";

export default function LoadoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { email } = useAuth();
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [rows, setRows] = useState<LoadoutItem[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [person, setPerson] = useState<Person | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [msg, setMsg] = useState<{
    kind: "ok" | "warn" | "err";
    text: string;
    offerAddItem?: boolean;
  } | null>(null);
  const [confirmItem, setConfirmItem] = useState<Item | null>(null);
  const [strayItem, setStrayItem] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const { data: lo } = await sb
      .from("loadouts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!lo) return;
    setLoadout(lo);
    const [{ data: li }, { data: its }, { data: ks }] = await Promise.all([
      sb.from("loadout_items").select("*").eq("loadout_id", id),
      sb.from("items").select("*"),
      sb.from("kits").select("*").order("name"),
    ]);
    setRows(li ?? []);
    setItems(its ?? []);
    setKits(ks ?? []);
    if (lo.person_id) {
      const { data: p } = await sb
        .from("people")
        .select("*")
        .eq("id", lo.person_id)
        .maybeSingle();
      setPerson(p);
    }
    if (lo.rental_id) {
      const { data: r } = await sb
        .from("rentals")
        .select("*")
        .eq("id", lo.rental_id)
        .maybeSingle();
      setRental(r);
    }
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

  const itemById = useCallback(
    (iid: string) => items.find((i) => i.id === iid),
    [items]
  );

  // ---------- DRAFT: building the load-out ----------

  async function addItem(item: Item, { skipWarn = false } = {}) {
    if (!loadout) return;
    if (rows.some((r) => r.item_id === item.id)) {
      setMsg({ kind: "warn", text: `${item.name} is already in this load-out.` });
      return;
    }
    if (item.status === "retired") {
      setMsg({ kind: "err", text: `${item.name} is retired and can't go out.` });
      return;
    }
    if (item.status !== "in_storage" && !skipWarn) {
      setConfirmItem(item); // currently out — require explicit confirmation
      return;
    }
    const { error } = await supabase()
      .from("loadout_items")
      .insert({ loadout_id: loadout.id, item_id: item.id });
    if (error) {
      setMsg({ kind: "err", text: error.message });
      return;
    }
    setMsg({ kind: "ok", text: `Added ${item.name}` });
    load();
  }

  async function addKit(kit: Kit) {
    const memberItems = items.filter((i) => i.kit_id === kit.id);
    const available = memberItems.filter(
      (i) => i.status === "in_storage" && !rows.some((r) => r.item_id === i.id)
    );
    const missing = memberItems.filter((i) => i.status !== "in_storage");
    if (available.length > 0 && loadout) {
      const { error } = await supabase()
        .from("loadout_items")
        .insert(
          available.map((i) => ({ loadout_id: loadout.id, item_id: i.id }))
        );
      if (error) {
        setMsg({ kind: "err", text: error.message });
        return;
      }
    }
    if (missing.length > 0) {
      setMsg({
        kind: "warn",
        text: `${kit.name}: added ${available.length} of ${memberItems.length} items. Not in storage: ${missing
          .map((i) => `${i.name} (${STATUS_LABELS[i.status]})`)
          .join(", ")}`,
      });
    } else if (memberItems.length === 0) {
      setMsg({ kind: "warn", text: `${kit.name} has no items.` });
    } else {
      setMsg({ kind: "ok", text: `Added ${kit.name} (${available.length} items)` });
    }
    load();
  }

  async function removeRow(row: LoadoutItem) {
    await supabase().from("loadout_items").delete().eq("id", row.id);
    load();
  }

  async function confirmCheckout() {
    if (!loadout || rows.length === 0) return;
    setBusy(true);
    for (const r of rows) {
      const it = itemById(r.item_id);
      if (!it) continue;
      await setItemStatus(it, loadout.destination_status, email, {
        personId: loadout.person_id,
        rentalId: loadout.rental_id,
        note: loadout.name ? `load-out: ${loadout.name}` : "load-out",
      });
    }
    await supabase()
      .from("loadouts")
      .update({ status: "open", checked_out_at: new Date().toISOString() })
      .eq("id", loadout.id);
    setBusy(false);
    setScanOpen(false);
    setMsg({ kind: "ok", text: "Checked out. Safe shoot!" });
    load();
  }

  // ---------- OPEN: checking back in ----------

  async function checkInRow(row: LoadoutItem) {
    const it = itemById(row.item_id);
    if (!it || !loadout) return;
    await supabase()
      .from("loadout_items")
      .update({ resolution: "returned", returned_at: new Date().toISOString() })
      .eq("id", row.id);
    await setItemStatus(it, "in_storage", email, {
      note: loadout.name ? `returned from ${loadout.name}` : "returned",
    });
    const { data: fresh } = await supabase()
      .from("loadout_items")
      .select("*")
      .eq("loadout_id", loadout.id);
    const pending = (fresh ?? []).filter((r) => r.resolution === null);
    if (pending.length === 0) {
      await supabase()
        .from("loadouts")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", loadout.id);
      setMsg({ kind: "ok", text: "All gear returned — load-out closed. ✓" });
    } else {
      setMsg({ kind: "ok", text: `${it.name} returned.` });
    }
    load();
  }

  async function handleScan(code: string) {
    const sb = supabase();
    const { data: it } = await sb
      .from("items")
      .select("*")
      .eq("short_code", code)
      .maybeSingle();
    if (!it) {
      setMsg({
        kind: "err",
        text: `No item matches code ${code}.`,
        offerAddItem: true,
      });
      return;
    }
    if (loadout?.status === "draft") {
      addItem(it as Item);
      return;
    }
    if (loadout?.status === "open") {
      const row = rows.find((r) => r.item_id === (it as Item).id);
      if (!row) {
        setStrayItem(it as Item); // not part of this load-out — offer plain check-in
        return;
      }
      if (row.resolution !== null) {
        setMsg({ kind: "warn", text: `${(it as Item).name} is already checked in.` });
        return;
      }
      checkInRow(row);
    }
  }

  if (!loadout) {
    return (
      <Shell title="Load-out" back="/loadouts">
        <p className="p-6 text-center text-n500">Loading…</p>
      </Shell>
    );
  }

  const title =
    loadout.name ||
    `${STATUS_LABELS[loadout.destination_status]}${person ? ` — ${person.name}` : ""}${rental ? ` — ${rental.client_name}` : ""}`;
  const returned = rows.filter((r) => r.resolution !== null);
  const pending = rows.filter((r) => r.resolution === null);

  return (
    <Shell title={title} back="/loadouts">
      <p className="mb-3 text-sm text-n500">
        {loadout.status === "draft" &&
          `Draft — scan gear going ${person ? `to ${person.name}` : rental ? `out to ${rental.client_name}` : "out"}.`}
        {loadout.status === "open" &&
          `${returned.length} of ${rows.length} returned`}
        {loadout.status === "closed" && `Closed — all ${rows.length} items back.`}
      </p>

      {msg && (
        <p
          className={`mb-3 rounded-lg p-3 text-sm ${
            msg.kind === "ok"
              ? "bg-success/10 text-success"
              : msg.kind === "warn"
                ? "bg-warning/10 text-warning"
                : "bg-error/10 text-error"
          }`}
        >
          {msg.text}
          {msg.offerAddItem && (
            <>
              {" "}
              <Link href="/items/new" className="font-semibold underline">
                Add it as a new item
              </Link>
            </>
          )}
        </p>
      )}

      {loadout.status !== "closed" && (
        <div className="mb-3">
          {scanOpen ? (
            <>
              <Scanner onCode={handleScan} paused={busy || !!confirmItem || !!strayItem} />
              <button
                onClick={() => setScanOpen(false)}
                className="mt-2 w-full rounded-lg border border-n300 bg-paper py-2 text-sm"
              >
                Close camera
              </button>
            </>
          ) : (
            <button
              onClick={() => setScanOpen(true)}
              className="w-full rounded-lg bg-gold py-3 font-semibold text-ink"
            >
              {loadout.status === "draft" ? "Scan gear in" : "Scan returns"}
            </button>
          )}
        </div>
      )}

      {loadout.status === "draft" && kits.length > 0 && (
        <details className="mb-3 rounded-xl bg-paper p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Add a whole kit
          </summary>
          <ul className="mt-2 space-y-2">
            {kits.map((k) => (
              <li key={k.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{k.name}</span>
                <button
                  onClick={() => addKit(k)}
                  className="rounded-lg border border-n300 px-2.5 py-1 text-xs font-medium"
                >
                  + Add kit
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mb-3 rounded-xl bg-paper p-4">
        <h2 className="mb-2 text-sm">
          {loadout.status === "open" && pending.length > 0
            ? `Still out (${pending.length})`
            : `Items (${rows.length})`}
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-n500">Nothing scanned yet.</p>
        ) : (
          <ul className="space-y-2">
            {[...pending, ...returned].map((r) => {
              const it = itemById(r.item_id);
              if (!it) return null;
              return (
                <li key={r.id} className="flex items-center gap-2">
                  <span
                    className={`text-lg ${r.resolution ? "text-success" : "text-n300"}`}
                  >
                    {r.resolution === "retired" ? "✕" : r.resolution ? "✓" : "○"}
                  </span>
                  <Link href={`/items/${it.id}`} className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${r.resolution ? "text-n400" : ""}`}>
                      {it.name}
                    </p>
                    {r.resolution === "retired" && (
                      <p className="text-xs text-error">resolved — retired/lost</p>
                    )}
                  </Link>
                  {loadout.status === "draft" && (
                    <button
                      onClick={() => removeRow(r)}
                      className="text-xs text-n400 underline"
                    >
                      Remove
                    </button>
                  )}
                  {loadout.status === "open" && r.resolution === null && (
                    <button
                      onClick={() => checkInRow(r)}
                      className="rounded-lg border border-n300 px-2.5 py-1 text-xs font-medium"
                    >
                      Check in
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {loadout.status === "draft" && (
        <button
          disabled={busy || rows.length === 0}
          onClick={confirmCheckout}
          className="w-full rounded-lg bg-ink py-3 font-semibold text-paper disabled:opacity-40"
        >
          {busy
            ? "Checking out…"
            : `Confirm Checkout (${rows.length} item${rows.length === 1 ? "" : "s"})`}
        </button>
      )}

      {/* Already-out confirmation (draft) */}
      {confirmItem && (
        <div className="fixed inset-0 z-30 flex items-end bg-ink/60">
          <div className="w-full rounded-t-2xl bg-paper p-4 pb-8">
            <p className="mb-3 text-sm">
              <span className="font-semibold">{confirmItem.name}</span> is
              currently <StatusBadge status={confirmItem.status} />. Add it to
              this load-out anyway and reassign it?
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg bg-gold py-2.5 font-semibold text-ink"
                onClick={() => {
                  const it = confirmItem;
                  setConfirmItem(null);
                  addItem(it, { skipWarn: true });
                }}
              >
                Add anyway
              </button>
              <button
                className="flex-1 rounded-lg border border-n300 py-2.5"
                onClick={() => setConfirmItem(null)}
              >
                Skip it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stray scan during check-in */}
      {strayItem && (
        <div className="fixed inset-0 z-30 flex items-end bg-ink/60">
          <div className="w-full rounded-t-2xl bg-paper p-4 pb-8">
            <p className="mb-3 text-sm">
              <span className="font-semibold">{strayItem.name}</span> isn&apos;t
              part of this load-out. Check it into storage anyway?
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg bg-gold py-2.5 font-semibold text-ink"
                onClick={async () => {
                  const it = strayItem;
                  setStrayItem(null);
                  await setItemStatus(it, "in_storage", email, {
                    note: "single-item check-in",
                  });
                  setMsg({ kind: "ok", text: `${it.name} checked into storage.` });
                  load();
                }}
              >
                Check in
              </button>
              <button
                className="flex-1 rounded-lg border border-n300 py-2.5"
                onClick={() => setStrayItem(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
