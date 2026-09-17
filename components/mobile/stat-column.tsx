import { cn } from "@/lib/utils";

/** Mirrors mobile's `StatColumn` — a labeled figure inside an attendance card row. */
export function StatColumn({
  label,
  value,
  divider,
  danger,
}: {
  label: string;
  value: string;
  divider?: boolean;
  /** Highlights the value in red, e.g. a late check-in time. */
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5",
        divider && "border-border border-l",
      )}
    >
      <span
        className={cn(
          "line-clamp-1 text-base font-bold",
          danger ? "text-red-600 dark:text-red-400" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="text-muted-foreground line-clamp-1 text-xs">
        {label}
      </span>
    </div>
  );
}
