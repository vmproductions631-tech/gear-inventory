"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { STATUS_LABELS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { Loadout, LoadoutItem } from "@/lib/types";

export default function LoadoutsPage() {
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [rows, setRows] = useState<LoadoutItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sb = supabase();
    Promise.all([
      sb
        .from("loadouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      sb.from("loadout_items").select("*"),
    ]).then(([l, li]) => {
      setLoadouts(l.data ?? []);
      setRows(li.data ?? []);
      setLoaded(true);
    });
  }, []);

  const groups: { title: string; status: Loadout["status"] }[] = [
    { title: "Out Now", status: "open" },
    { title: "Drafts", status: "draft" },
    { title: "Closed", status: "closed" },
  ];

  return (
    <Shell title="Load-outs">
      <div className="mb-3 flex justify-end">
        <Link
          href="/loadouts/new"
          className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-ink"
        >
          + New Load-out
        </Link>
      </div>
      {loaded && loadouts.length === 0 && (
        <p className="rounded-xl bg-paper p-6 text-center text-sm text-n500">
          No load-outs yet. Start one before a shoot, scan everything going in
          the van, and check it all back in when you return.
        </p>
      )}
      {groups.map((g) => {
        const list = loadouts.filter((l) => l.status === g.status);
        if (list.length === 0) return null;
        return (
          <section key={g.status} className="mb-4">
            <h2 className="mb-2 text-sm text-n500">{g.title}</h2>
            <ul className="space-y-2">
              {list.map((l) => {
                const its = rows.filter((r) => r.loadout_id === l.id);
                const back = its.filter((r) => r.resolution !== null).length;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/loadouts/${l.id}`}
                      className="block rounded-xl bg-paper p-3"
                    >
                      <p className="font-medium">
                        {l.name || STATUS_LABELS[l.destination_status]}
                      </p>
                      <p className="text-xs text-n500">
                        {l.status === "open"
                          ? `${back} of ${its.length} returned`
                          : l.status === "draft"
                            ? `${its.length} items — not checked out yet`
                            : `${its.length} items · closed`}
                        {" · "}
                        {new Date(l.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </Shell>
  );
}
