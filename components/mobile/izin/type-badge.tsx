import { cn } from "@/lib/utils";

export type LeaveType = "Sakit" | "Izin" | "Cuti";

const TYPE_TEXT_CLASSES: Record<LeaveType, string> = {
  Sakit: "text-orange-600 dark:text-orange-400",
  Izin: "text-amber-600 dark:text-amber-400",
  Cuti: "text-blue-600 dark:text-blue-400",
};

/** Mirrors mobile's `TypeBadge`. */
export function TypeBadge({ type }: { type: LeaveType }) {
  return (
    <span className={cn("text-xs font-semibold", TYPE_TEXT_CLASSES[type])}>
      {type}
    </span>
  );
}
