import { cn } from "@/lib/utils";

/** Mirrors mobile's `AttendanceTimeItem` — one of the 3 hero figures in the check-in/out card. */
export function AttendanceTimeItem({
  label,
  value,
  size = "lg",
  tone = "default",
}: {
  label: string;
  value: string;
  /** `lg` for the hero check-in/check-out figures, `sm` for a derived stat like total hours. */
  size?: "lg" | "sm";
  tone?: "default" | "primary" | "muted" | "danger";
}) {
  const valueClass =
    size === "lg"
      ? cn(
          "text-2xl font-bold",
          tone === "primary" && "text-primary",
          tone === "muted" && "text-muted-foreground",
          tone === "danger" && "text-red-600 dark:text-red-400",
          tone === "default" && "text-foreground",
        )
      : "text-base font-semibold text-foreground";

  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className={cn(valueClass, "text-center")}>{value}</span>
      <span className="text-muted-foreground text-center text-xs">{label}</span>
    </div>
  );
}
