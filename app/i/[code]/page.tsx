"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

/** QR landing: resolve a short code to its item page. */
export default function CodeLanding() {
  const { code } = useParams<{ code: string }>();
  const { session, loading } = useAuth();
  const router = useRouter();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (loading || !session) return;
    supabase()
      .from("items")
      .select("id")
      .eq("short_code", code)
      .maybeSingle()
      .then(({ data }) => {
        if (data) router.replace(`/items/${data.id}`);
        else setNotFound(true);
      });
  }, [code, loading, session, router]);

  return (
    <Shell title="Scan">
      {notFound ? (
        <div className="rounded-xl bg-paper p-6 text-center">
          <p className="mb-1 font-semibold">No item matches this code.</p>
          <p className="mb-4 text-sm text-n500">
            Code <span className="font-mono">{code}</span> isn&apos;t in the
            inventory.
          </p>
          <Link
            href="/items/new"
            className="inline-block rounded-lg bg-gold px-4 py-2 font-semibold text-ink"
          >
            Add a new item
          </Link>
        </div>
      ) : (
        <p className="p-6 text-center text-n500">Looking up item…</p>
      )}
    </Shell>
  );
}
