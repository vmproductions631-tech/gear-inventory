import { STATUS_LABELS } from "@/lib/constants";
import type { ItemStatus } from "@/lib/types";

const COLORS: Record<ItemStatus, string> = {
  in_storage: "bg-n100 text-n600",
  with_owner: "bg-info/15 text-info",
  with_operator: "bg-info/15 text-info",
  with_crew: "bg-warning/15 text-warning",
  rented_out: "bg-gold/20 text-gold-deep",
  out_other: "bg-n200 text-n600",
  retired: "bg-error/10 text-error",
};

export default function StatusBadge({
  status,
  detail,
}: {
  status: ItemStatus;
  detail?: string | null;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
      {detail ? ` · ${detail}` : ""}
    </span>
  );
}
