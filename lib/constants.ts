export const CATEGORIES = [
  { value: "camera", label: "Camera" },
  { value: "lens", label: "Lens" },
  { value: "audio", label: "Audio" },
  { value: "lighting", label: "Lighting" },
  { value: "grip", label: "Grip" },
  { value: "cables_power", label: "Cables & Power" },
  { value: "other", label: "Other" },
] as const;

export const OWNERS = [
  { value: "owner", label: "Owner" },
  { value: "operator", label: "Operator" },
  { value: "assistant", label: "Assistant" },
] as const;

export const RETIRE_REASONS = [
  { value: "sold", label: "Sold" },
  { value: "lost", label: "Lost" },
  { value: "broken", label: "Broken" },
  { value: "other", label: "Other" },
] as const;

export const STATUS_LABELS: Record<string, string> = {
  in_storage: "In Storage",
  with_owner: "With Owner",
  with_operator: "With Operator",
  with_crew: "With Crew",
  rented_out: "Rented Out",
  out_other: "Out — Other",
  retired: "Retired",
};

export const OUT_STATUSES = [
  "with_owner",
  "with_operator",
  "with_crew",
  "rented_out",
  "out_other",
];

export function categoryLabel(v: string) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

export function ownerLabel(v: string) {
  return OWNERS.find((o) => o.value === v)?.label ?? v;
}

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
