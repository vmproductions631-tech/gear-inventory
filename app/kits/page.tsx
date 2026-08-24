"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { money } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import Photo from "@/components/Photo";
import type { Item, Kit } from "@/lib/types";

export default function KitsPage() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sb = supabase();
    Promise.all([
      sb.from("kits").select("*").order("name"),
      sb.from("items").select("*").neq("status", "retired"),
    ]).then(([k, i]) => {
      setKits(k.data ?? []);
      setItems(i.data ?? []);
      setLoaded(true);
    });
  }, []);

  return (
    <Shell title="Kits">
      <div className="mb-3 flex justify-end">
        <Link
          href="/kits/new"
          className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-ink"
        >
          + New Kit
        </Link>
      </div>
      {loaded && kits.length === 0 ? (
        <p className="rounded-xl bg-paper p-6 text-center text-sm text-n500">
          No kits yet. A kit groups items — like an A-Cam package — so you can
          check them out together.
        </p>
      ) : (
        <ul className="space-y-2">
          {kits.map((k) => {
            const members = items.filter((i) => i.kit_id === k.id);
            const replaceTotal = members.reduce(
              (s, i) => s + (i.replacement_value ?? 0),
              0
            );
            return (
              <li key={k.id}>
                <Link
                  href={`/kits/${k.id}`}
                  className="flex items-center gap-3 rounded-xl bg-paper p-3"
                >
                  <Photo
                    path={k.photo_path}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                    placeholder={
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-n100 text-n400">
                        ▥
                      </div>
                    }
                  />
                  <div className="flex-1">
                    <p className="font-medium">{k.name}</p>
                    <p className="text-xs text-n500">
                      {members.length} items · {money(replaceTotal)} replacement
                    </p>
                  </div>
                  {k.rental_rate ? (
                    <span className="text-sm text-n500">
                      {money(k.rental_rate)}/day
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
