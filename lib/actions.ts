import { customAlphabet } from "nanoid";
import { supabase } from "./supabase";
import type { Item, ItemStatus } from "./types";

// Unambiguous alphabet (no 0/O, 1/I/l) for QR short codes.
const makeCode = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 8);

export function newShortCode(): string {
  return makeCode();
}

export function itemUrl(shortCode: string): string {
  // Labels encode the origin the app is served from, so moving to
  // gear.visionmakerproductions.com needs no code change — reprint only.
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/i/${shortCode}`;
}

export interface StatusChangeOpts {
  personId?: string | null;
  rentalId?: string | null;
  note?: string | null;
}

/** Change an item's status and write the history row. */
export async function setItemStatus(
  item: Pick<Item, "id" | "status">,
  newStatus: ItemStatus,
  changedBy: string,
  opts: StatusChangeOpts = {}
): Promise<{ error: string | null }> {
  const sb = supabase();
  const patch: Record<string, unknown> = {
    status: newStatus,
    assigned_person_id: newStatus === "with_crew" ? (opts.personId ?? null) : null,
    rental_id: newStatus === "rented_out" ? (opts.rentalId ?? null) : null,
    status_note: newStatus === "out_other" ? (opts.note ?? null) : null,
  };
  const { error } = await sb.from("items").update(patch).eq("id", item.id);
  if (error) return { error: error.message };
  const { error: logErr } = await sb.from("status_log").insert({
    item_id: item.id,
    old_status: item.status,
    new_status: newStatus,
    person_id: newStatus === "with_crew" ? (opts.personId ?? null) : null,
    rental_id: newStatus === "rented_out" ? (opts.rentalId ?? null) : null,
    note: opts.note ?? null,
    changed_by: changedBy,
  });
  if (logErr) return { error: logErr.message };
  return { error: null };
}

/** Retire an item (terminal status with a reason). */
export async function retireItem(
  item: Pick<Item, "id" | "status">,
  reason: string,
  note: string | null,
  changedBy: string
): Promise<{ error: string | null }> {
  const sb = supabase();
  const { error } = await sb
    .from("items")
    .update({
      status: "retired",
      retired_reason: reason,
      retired_note: note,
      retired_at: new Date().toISOString(),
      assigned_person_id: null,
      rental_id: null,
      status_note: null,
    })
    .eq("id", item.id);
  if (error) return { error: error.message };
  // Resolve any pending load-out rows for this item as retired.
  const { data: affected } = await sb
    .from("loadout_items")
    .update({ resolution: "retired", returned_at: new Date().toISOString() })
    .eq("item_id", item.id)
    .is("resolution", null)
    .select("loadout_id");
  // A load-out closes when its last outstanding item is resolved — including
  // resolution by retirement, not only by check-in (spec Req 24).
  for (const row of affected ?? []) {
    const { data: pending } = await sb
      .from("loadout_items")
      .select("id")
      .eq("loadout_id", row.loadout_id)
      .is("resolution", null)
      .limit(1);
    if ((pending ?? []).length === 0) {
      await sb
        .from("loadouts")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", row.loadout_id)
        .eq("status", "open");
    }
  }
  const { error: logErr } = await sb.from("status_log").insert({
    item_id: item.id,
    old_status: item.status,
    new_status: "retired",
    note: note ? `${reason}: ${note}` : reason,
    changed_by: changedBy,
  });
  if (logErr) return { error: logErr.message };
  return { error: null };
}

/** Un-retire an item back to storage. */
export async function unretireItem(
  item: Pick<Item, "id" | "status">,
  changedBy: string
): Promise<{ error: string | null }> {
  const sb = supabase();
  const { error } = await sb
    .from("items")
    .update({
      status: "in_storage",
      retired_reason: null,
      retired_note: null,
      retired_at: null,
    })
    .eq("id", item.id);
  if (error) return { error: error.message };
  await sb.from("status_log").insert({
    item_id: item.id,
    old_status: "retired",
    new_status: "in_storage",
    note: "un-retired",
    changed_by: changedBy,
  });
  return { error: null };
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(r: {
  date_due: string;
  date_returned: string | null;
}): boolean {
  return !r.date_returned && r.date_due < todayISO();
}
