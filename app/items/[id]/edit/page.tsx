"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import ItemForm, {
  formToRow,
  itemToForm,
  type ItemFormValues,
} from "@/components/ItemForm";
import { supabase } from "@/lib/supabase";
import type { Item } from "@/lib/types";

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const [values, setValues] = useState<ItemFormValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase()
      .from("items")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setValues(itemToForm(data as Item));
      });
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!values) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase()
      .from("items")
      .update(formToRow(values))
      .eq("id", id);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.replace(`/items/${id}`);
  }

  return (
    <Shell title="Edit Item" back={`/items/${id}`}>
      {!values ? (
        <p className="p-6 text-center text-n500">Loading…</p>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <ItemForm
            values={values}
            onChange={setValues}
            photoKeyPrefix="items"
          />
          {error && (
            <p className="rounded-lg bg-error/10 p-3 text-sm text-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-gold px-4 py-3 font-semibold text-ink disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </form>
      )}
    </Shell>
  );
}
