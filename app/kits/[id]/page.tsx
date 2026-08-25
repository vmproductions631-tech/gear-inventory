"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import StatusBadge from "@/components/StatusBadge";
import PhotoInput from "@/components/PhotoInput";
import { money } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import Photo from "@/components/Photo";
import type { Item, Kit } from "@/lib/types";

const field =
  "w-full rounded-lg border border-n300 bg-paper px-3 py-2.5 text-base";

export default function KitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [kit, setKit] = useState<Kit | null>(null);
  const [members, setMembers] = useState<Item[]>([]);
  const [free, setFree] = useState<Item[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const { data: k } = await sb
      .from("kits")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!k) return;
    setKit(k);
    setName(k.name);
    setRate(k.rental_rate?.toString() ?? "");
    setNotes(k.notes ?? "");
    setPhoto(k.photo_path);
    const { data: all } = await sb
      .from("items")
      .select("*")
      .neq("status", "retired")
      .order("name");
    setMembers((all ?? []).filter((i) => i.kit_id === id));
    setFree((all ?? []).filter((i) => i.kit_id === null));
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

  if (!kit) {
    return (
      <Shell title="Kit" back="/kits">
        <p className="p-6 text-center text-n500">Loading…</p>
      </Shell>
    );
  }

  const purchaseTotal = members.reduce(
    (s, i) => s + (i.purchase_price ?? 0),
    0
  );
  const replaceTotal = members.reduce(
    (s, i) => s + (i.replacement_value ?? 0),
    0
  );

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await supabase()
      .from("kits")
      .update({
        name: name.trim(),
        rental_rate: rate.trim() === "" ? null : Number(rate),
        notes: notes.trim() || null,
        photo_path: photo,
      })
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setEditing(false);
    load();
  }

  async function addMember(itemId: string) {
    const { error: err } = await supabase()
      .from("items")
      .update({ kit_id: id })
      .eq("id", itemId);
    if (err) setError(err.message);
    load();
  }

  async function removeMember(itemId: string) {
    const { error: err } = await supabase()
      .from("items")
      .update({ kit_id: null })
      .eq("id", itemId);
    if (err) setError(err.message);
    load();
  }

  async function deleteKit() {
    if (
      !confirm(
        `Delete kit "${kit!.name}"? Its ${members.length} items are NOT deleted — they just leave the kit.`
      )
    )
      return;
    // Release members first, then remove the kit.
    await supabase().from("items").update({ kit_id: null }).eq("kit_id", id);
    const { error: err } = await supabase().from("kits").delete().eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    router.replace("/kits");
  }

  return (
    <Shell title={kit.name} back="/kits">
      {!editing && (
        <Photo
          path={kit.photo_path}
          alt={kit.name}
          className="mb-3 h-44 w-full rounded-xl object-cover"
          placeholder={null}
        />
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
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="number"
            step="0.01"
            min="0"
            className={field}
            placeholder="Kit rate $/day"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <PhotoInput value={photo} keyPrefix="kits" onChange={setPhoto} />
          <textarea
            className={field}
            rows={2}
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            <dt className="text-n500">Kit rate</dt>
            <dd>{kit.rental_rate ? `${money(kit.rental_rate)}/day` : "—"}</dd>
            <dt className="text-n500">Items</dt>
            <dd>{members.length}</dd>
            <dt className="text-n500">Purchase total</dt>
            <dd>{money(purchaseTotal)}</dd>
            <dt className="text-n500">Replacement total</dt>
            <dd className="font-semibold">{money(replaceTotal)}</dd>
          </dl>
          {kit.notes && <p className="mt-2 text-sm text-n600">{kit.notes}</p>}
          <button
            onClick={() => setEditing(true)}
            className="mt-3 w-full rounded-lg border border-n300 py-2 text-sm font-medium"
          >
            Edit Kit
          </button>
        </div>
      )}

      <div className="mb-3 rounded-xl bg-paper p-4">
        <h2 className="mb-2 text-sm">In this kit</h2>
        {members.length === 0 ? (
          <p className="text-sm text-n500">No items yet — add some below.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((i) => (
              <li key={i.id} className="flex items-center gap-2">
                <Link href={`/items/${i.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.name}</p>
                  <StatusBadge status={i.status} />
                </Link>
                <button
                  onClick={() => removeMember(i.id)}
                  className="text-xs text-n400 underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {free.length > 0 && (
        <details className="mb-3 rounded-xl bg-paper p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Add items to kit ({free.length} available)
          </summary>
          <ul className="mt-2 space-y-2">
            {free.map((i) => (
              <li key={i.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{i.name}</span>
                <button
                  onClick={() => addMember(i.id)}
                  className="rounded-lg border border-n300 px-2.5 py-1 text-xs font-medium"
                >
                  + Add
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <button
        onClick={deleteKit}
        className="w-full py-1 text-center text-xs text-error underline"
      >
        Delete kit (items are released, not deleted)
      </button>
    </Shell>
  );
}
