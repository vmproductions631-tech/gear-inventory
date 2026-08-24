"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/components/AuthProvider";
import {
  RETIRE_REASONS,
  STATUS_LABELS,
  categoryLabel,
  money,
  ownerLabel,
} from "@/lib/constants";
import { retireItem, setItemStatus, unretireItem } from "@/lib/actions";
import { supabase } from "@/lib/supabase";
import Photo from "@/components/Photo";
import type { Item, ItemStatus, Kit, Person, Rental, StatusLog } from "@/lib/types";

type Sheet =
  | null
  | { kind: "person" }
  | { kind: "rental" }
  | { kind: "note" }
  | { kind: "retire" };

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { email } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [kit, setKit] = useState<Kit | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [log, setLog] = useState<StatusLog[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [noteText, setNoteText] = useState("");
  const [retireReason, setRetireReason] = useState("sold");
  const [retireNote, setRetireNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const { data: it } = await sb
      .from("items")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!it) {
      setMissing(true);
      return;
    }
    setItem(it);
    if (it.kit_id) {
      const { data: k } = await sb
        .from("kits")
        .select("*")
        .eq("id", it.kit_id)
        .maybeSingle();
      setKit(k);
    } else {
      setKit(null);
    }
    const [{ data: ppl }, { data: rts }, { data: lg }] = await Promise.all([
      sb.from("people").select("*").order("name"),
      sb
        .from("rentals")
        .select("*")
        .is("date_returned", null)
        .order("date_out", { ascending: false }),
      sb
        .from("status_log")
        .select("*")
        .eq("item_id", id)
        .order("changed_at", { ascending: false })
        .limit(50),
    ]);
    setPeople(ppl ?? []);
    setRentals(rts ?? []);
    setLog(lg ?? []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(
    status: ItemStatus,
    opts: { personId?: string; rentalId?: string; note?: string } = {}
  ) {
    if (!item) return;
    setBusy(true);
    setError(null);
    const { error: err } = await setItemStatus(item, status, email, opts);
    setBusy(false);
    setSheet(null);
    if (err) {
      setError(err);
      return;
    }
    load();
  }

  async function doRetire() {
    if (!item) return;
    setBusy(true);
    const { error: err } = await retireItem(
      item,
      retireReason,
      retireNote.trim() || null,
      email
    );
    setBusy(false);
    setSheet(null);
    if (err) setError(err);
    load();
  }

  async function hardDelete() {
    if (!item) return;
    if (
      !confirm(
        `Permanently delete "${item.name}"? Only do this for mistaken entries — for sold/lost/broken gear use Retire, which keeps the history.`
      )
    )
      return;
    const { error: err } = await supabase()
      .from("items")
      .delete()
      .eq("id", item.id);
    if (err) {
      setError(err.message);
      return;
    }
    router.replace("/items");
  }

  if (missing) {
    return (
      <Shell title="Item" back="/items">
        <p className="rounded-xl bg-paper p-6 text-center text-n500">
          This item no longer exists.
        </p>
      </Shell>
    );
  }

  if (!item) {
    return (
      <Shell title="Item" back="/items">
        <p className="p-6 text-center text-n500">Loading…</p>
      </Shell>
    );
  }

  const retired = item.status === "retired";
  const personName = (pid: string | null) =>
    people.find((p) => p.id === pid)?.name ?? null;
  const rentalName = (rid: string | null) =>
    rentals.find((r) => r.id === rid)?.client_name ?? null;

  const statusDetail =
    item.status === "with_crew"
      ? personName(item.assigned_person_id)
      : item.status === "rented_out"
        ? rentalName(item.rental_id)
        : item.status === "out_other"
          ? item.status_note
          : null;

  const statusBtn =
    "rounded-lg border border-n300 bg-paper px-3 py-2.5 text-sm font-medium disabled:opacity-40";

  return (
    <Shell title={item.name} back="/items">
      <Photo
        path={item.photo_path}
        alt={item.name}
        className="mb-3 h-52 w-full rounded-xl object-cover"
        placeholder={null}
      />

      <div className="mb-3 rounded-xl bg-paper p-4">
        <div className="mb-2 flex items-center justify-between">
          <StatusBadge status={item.status} detail={statusDetail} />
          <span className="font-mono text-xs text-n400">{item.short_code}</span>
        </div>
        {retired && (
          <p className="mb-2 rounded-lg bg-error/10 p-2 text-sm text-error">
            Retired{item.retired_reason ? ` — ${item.retired_reason}` : ""}
            {item.retired_note ? ` (${item.retired_note})` : ""}
          </p>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-n500">Category</dt>
          <dd>{categoryLabel(item.category)}</dd>
          <dt className="text-n500">Owner</dt>
          <dd>{ownerLabel(item.owner)}</dd>
          <dt className="text-n500">Purchase</dt>
          <dd>{money(item.purchase_price)}</dd>
          <dt className="text-n500">Replacement</dt>
          <dd>{money(item.replacement_value)}</dd>
          <dt className="text-n500">Rate</dt>
          <dd>{item.rental_rate ? `${money(item.rental_rate)}/day` : "—"}</dd>
          <dt className="text-n500">Kit</dt>
          <dd>
            {kit ? (
              <Link href={`/kits/${kit.id}`} className="underline">
                {kit.name}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </dl>
        {item.notes && <p className="mt-2 text-sm text-n600">{item.notes}</p>}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-error/10 p-3 text-sm text-error">
          {error}
        </p>
      )}

      {!retired ? (
        <div className="mb-3 rounded-xl bg-paper p-4">
          <h2 className="mb-2 text-sm">Change Status</h2>
          <div className="grid grid-cols-2 gap-2">
            {item.status !== "in_storage" && (
              <button
                disabled={busy}
                className={`${statusBtn} col-span-2 bg-gold font-semibold`}
                onClick={() => changeStatus("in_storage")}
              >
                ✓ Back In Storage
              </button>
            )}
            {item.status !== "with_owner" && (
              <button
                disabled={busy}
                className={statusBtn}
                onClick={() => changeStatus("with_owner")}
              >
                With Owner
              </button>
            )}
            {item.status !== "with_operator" && (
              <button
                disabled={busy}
                className={statusBtn}
                onClick={() => changeStatus("with_operator")}
              >
                With Operator
              </button>
            )}
            <button
              disabled={busy}
              className={statusBtn}
              onClick={() => setSheet({ kind: "person" })}
            >
              With Crew…
            </button>
            <button
              disabled={busy}
              className={statusBtn}
              onClick={() => setSheet({ kind: "rental" })}
            >
              Rented Out…
            </button>
            <button
              disabled={busy}
              className={`${statusBtn} col-span-2`}
              onClick={() => {
                setNoteText("");
                setSheet({ kind: "note" });
              }}
            >
              Out — Other…
            </button>
          </div>
        </div>
      ) : (
        <button
          disabled={busy}
          className="mb-3 w-full rounded-lg border border-n300 bg-paper py-2.5 text-sm font-medium"
          onClick={async () => {
            await unretireItem(item, email);
            load();
          }}
        >
          Un-retire (back to storage)
        </button>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Link
          href={`/items/${item.id}/label`}
          className="rounded-lg border border-n300 bg-paper py-2.5 text-center text-sm font-medium"
        >
          QR Label
        </Link>
        <Link
          href={`/items/${item.id}/edit`}
          className="rounded-lg border border-n300 bg-paper py-2.5 text-center text-sm font-medium"
        >
          Edit
        </Link>
      </div>

      {!retired && (
        <button
          className="mb-3 w-full rounded-lg border border-error/40 py-2.5 text-sm font-medium text-error"
          onClick={() => setSheet({ kind: "retire" })}
        >
          Retire Item…
        </button>
      )}
      <button
        className="mb-4 w-full py-1 text-center text-xs text-n400 underline"
        onClick={hardDelete}
      >
        Hard delete (mistaken entry only)
      </button>

      <div className="rounded-xl bg-paper p-4">
        <h2 className="mb-2 text-sm">History</h2>
        {log.length === 0 ? (
          <p className="text-sm text-n500">No history yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {log.map((l) => (
              <li key={l.id} className="border-b border-n100 pb-2 last:border-0">
                <p>
                  {l.old_status ? `${STATUS_LABELS[l.old_status]} → ` : ""}
                  <span className="font-medium">
                    {STATUS_LABELS[l.new_status]}
                  </span>
                  {l.note ? ` — ${l.note}` : ""}
                </p>
                <p className="text-xs text-n400">
                  {new Date(l.changed_at).toLocaleString()} · {l.changed_by}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bottom sheets */}
      {sheet && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-ink/60"
          onClick={() => setSheet(null)}
        >
          <div
            className="w-full rounded-t-2xl bg-paper p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {sheet.kind === "person" && (
              <>
                <h2 className="mb-3 text-sm">Assign to crew</h2>
                {people.length === 0 && (
                  <p className="mb-2 text-sm text-n500">
                    No crew yet — add people under More → People.
                  </p>
                )}
                <ul className="space-y-2">
                  {people.map((p) => (
                    <li key={p.id}>
                      <button
                        disabled={busy}
                        className="w-full rounded-lg border border-n300 px-3 py-2.5 text-left"
                        onClick={() =>
                          changeStatus("with_crew", { personId: p.id })
                        }
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {sheet.kind === "rental" && (
              <>
                <h2 className="mb-3 text-sm">Attach to rental</h2>
                {rentals.length === 0 && (
                  <p className="mb-2 text-sm text-n500">
                    No open rentals.{" "}
                    <Link href="/rentals/new" className="underline">
                      Create one first
                    </Link>
                    .
                  </p>
                )}
                <ul className="space-y-2">
                  {rentals.map((r) => (
                    <li key={r.id}>
                      <button
                        disabled={busy}
                        className="w-full rounded-lg border border-n300 px-3 py-2.5 text-left"
                        onClick={() =>
                          changeStatus("rented_out", { rentalId: r.id })
                        }
                      >
                        {r.client_name}
                        <span className="block text-xs text-n400">
                          due back {r.date_due}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {sheet.kind === "note" && (
              <>
                <h2 className="mb-3 text-sm">Out — where?</h2>
                <input
                  autoFocus
                  className="mb-3 w-full rounded-lg border border-n300 px-3 py-2.5"
                  placeholder="e.g. left on location, repair shop…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button
                  disabled={busy}
                  className="w-full rounded-lg bg-gold py-2.5 font-semibold text-ink"
                  onClick={() =>
                    changeStatus("out_other", { note: noteText.trim() || undefined })
                  }
                >
                  Mark Out
                </button>
              </>
            )}
            {sheet.kind === "retire" && (
              <>
                <h2 className="mb-3 text-sm">Retire {item.name}</h2>
                <div className="mb-3 grid grid-cols-4 gap-2">
                  {RETIRE_REASONS.map((r) => (
                    <button
                      key={r.value}
                      className={`rounded-lg border px-2 py-2 text-sm ${
                        retireReason === r.value
                          ? "border-ink bg-ink text-paper"
                          : "border-n300"
                      }`}
                      onClick={() => setRetireReason(r.value)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <input
                  className="mb-3 w-full rounded-lg border border-n300 px-3 py-2.5"
                  placeholder="Note (optional)"
                  value={retireNote}
                  onChange={(e) => setRetireNote(e.target.value)}
                />
                <button
                  disabled={busy}
                  className="w-full rounded-lg bg-error py-2.5 font-semibold text-paper"
                  onClick={doRetire}
                >
                  Retire Item
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
