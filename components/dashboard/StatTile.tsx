import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  icon: LucideIcon;
  value: string;
  footerLabel: string;
  /** Perubahan terhadap pembanding; null kalau tidak ada data pembanding. */
  delta?: { text: string; direction: "up" | "down" | "flat" } | null;
};

export default function StatTile({
  label,
  icon: Icon,
  value,
  footerLabel,
  delta,
}: Props) {
  const Arrow = delta?.direction === "down" ? TrendingDown : TrendingUp;

  return (
    <div className="bg-card border-border flex flex-col gap-3 rounded-2xl border p-4 shadow-xs">
      <div className="flex items-center gap-2.5">
        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </span>
        <p className="text-muted-foreground truncate text-sm">{label}</p>
      </div>

      <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>

      <div className="border-border flex items-center justify-between gap-2 border-t pt-3 text-xs">
        <span className="text-muted-foreground truncate">{footerLabel}</span>

        {delta && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 font-medium tabular-nums",
              delta.direction === "up" && "text-chart-hadir",
              delta.direction === "down" && "text-chart-terlambat",
              delta.direction === "flat" && "text-muted-foreground",
            )}
          >
            {delta.direction !== "flat" && <Arrow className="size-3.5" />}
            {delta.text}
          </span>
        )}
      </div>
    </div>
  );
}
