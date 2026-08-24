export type ItemStatus =
  | "in_storage"
  | "with_owner"
  | "with_operator"
  | "with_crew"
  | "rented_out"
  | "out_other"
  | "retired";

export interface Person {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface Rental {
  id: string;
  client_name: string;
  client_contact: string | null;
  date_out: string;
  date_due: string;
  date_returned: string | null;
  notes: string | null;
  created_at: string;
}

export interface Kit {
  id: string;
  name: string;
  photo_path: string | null;
  rental_rate: number | null;
  notes: string | null;
  created_at: string;
}

export interface Item {
  id: string;
  short_code: string;
  name: string;
  category: string;
  photo_path: string | null;
  status: ItemStatus;
  assigned_person_id: string | null;
  rental_id: string | null;
  status_note: string | null;
  purchase_price: number | null;
  replacement_value: number | null;
  rental_rate: number | null;
  owner: string;
  kit_id: string | null;
  notes: string | null;
  retired_reason: string | null;
  retired_note: string | null;
  retired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Loadout {
  id: string;
  name: string | null;
  destination_status: ItemStatus;
  person_id: string | null;
  rental_id: string | null;
  status: "draft" | "open" | "closed";
  created_by: string | null;
  checked_out_at: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface LoadoutItem {
  id: string;
  loadout_id: string;
  item_id: string;
  returned_at: string | null;
  resolution: "returned" | "retired" | null;
}

export interface StatusLog {
  id: number;
  item_id: string;
  old_status: ItemStatus | null;
  new_status: ItemStatus;
  person_id: string | null;
  rental_id: string | null;
  note: string | null;
  changed_by: string;
  changed_at: string;
}
