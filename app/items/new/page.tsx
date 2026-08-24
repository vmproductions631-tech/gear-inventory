"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import ItemForm, {
  formToRow,
  itemToForm,
  type ItemFormValues,
} from "@/components/ItemForm";
import { useAuth } from "@/components/AuthProvider";
import { newShortCode } from "@/lib/actions";
import { supabase } from "@/lib/supabase";

export default function NewItemPage() {
  const [values, setValues] = useState<ItemFormValues>(itemToForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { email } = useAuth();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const sb = supabase();
    const short_code = newShortCode();
    const { data, error: err } = await sb
      .from("items")
      .insert({ ...formToRow(values), short_code })
      .select("id")
      .single();
    if (err || !data) {
      setBusy(false);
      setError(err?.message ?? "Save failed");
      return;
    }
    await sb.from("status_log").insert({
      item_id: data.id,
      old_status: null,
      new_status: "in_storage",
      note: "item created",
      changed_by: email,
    });
    router.replace(`/items/${data.id}?created=1`);
  }

  return (
    <Shell title="Add Gear" back="/items">
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
          {busy ? "Saving…" : "Save Item"}
        </button>
      </form>
    </Shell>
  );
}
