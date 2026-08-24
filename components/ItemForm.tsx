"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, OWNERS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { Item, Kit } from "@/lib/types";
import PhotoInput from "./PhotoInput";

export interface ItemFormValues {
  name: string;
  category: string;
  owner: string;
  photo_path: string | null;
  purchase_price: string;
  replacement_value: string;
  rental_rate: string;
  kit_id: string;
  notes: string;
}

export function itemToForm(item?: Item | null): ItemFormValues {
  return {
    name: item?.name ?? "",
    category: item?.category ?? "camera",
    owner: item?.owner ?? "owner",
    photo_path: item?.photo_path ?? null,
    purchase_price: item?.purchase_price?.toString() ?? "",
    replacement_value: item?.replacement_value?.toString() ?? "",
    rental_rate: item?.rental_rate?.toString() ?? "",
    kit_id: item?.kit_id ?? "",
    notes: item?.notes ?? "",
  };
}

export function formToRow(v: ItemFormValues) {
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  return {
    name: v.name.trim(),
    category: v.category,
    owner: v.owner,
    photo_path: v.photo_path,
    purchase_price: num(v.purchase_price),
    replacement_value: num(v.replacement_value),
    rental_rate: num(v.rental_rate),
    kit_id: v.kit_id === "" ? null : v.kit_id,
    notes: v.notes.trim() === "" ? null : v.notes.trim(),
  };
}

const field =
  "w-full rounded-lg border border-n300 bg-paper px-3 py-2.5 text-base";
const label = "mb-1 block text-sm font-medium text-n600";

export default function ItemForm({
  values,
  onChange,
  photoKeyPrefix,
}: {
  values: ItemFormValues;
  onChange: (v: ItemFormValues) => void;
  photoKeyPrefix: string;
}) {
  const [kits, setKits] = useState<Kit[]>([]);

  useEffect(() => {
    supabase()
      .from("kits")
      .select("*")
      .order("name")
      .then(({ data }) => setKits(data ?? []));
  }, []);

  const set = (patch: Partial<ItemFormValues>) =>
    onChange({ ...values, ...patch });

  return (
    <div className="space-y-4">
      <div>
        <label className={label}>Name *</label>
        <input
          required
          className={field}
          value={values.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Sony FX6 body"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Category</label>
          <select
            className={field}
            value={values.category}
            onChange={(e) => set({ category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Owner</label>
          <select
            className={field}
            value={values.owner}
            onChange={(e) => set({ owner: e.target.value })}
          >
            {OWNERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <PhotoInput
        value={values.photo_path}
        keyPrefix={photoKeyPrefix}
        onChange={(url) => set({ photo_path: url })}
      />
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={label}>Purchase $</label>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            className={field}
            value={values.purchase_price}
            onChange={(e) => set({ purchase_price: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>Replace $</label>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            className={field}
            value={values.replacement_value}
            onChange={(e) => set({ replacement_value: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>Rate $/day</label>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            className={field}
            value={values.rental_rate}
            onChange={(e) => set({ rental_rate: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className={label}>Kit</label>
        <select
          className={field}
          value={values.kit_id}
          onChange={(e) => set({ kit_id: e.target.value })}
        >
          <option value="">No kit</option>
          {kits.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label}>Notes</label>
        <textarea
          className={field}
          rows={3}
          value={values.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}
