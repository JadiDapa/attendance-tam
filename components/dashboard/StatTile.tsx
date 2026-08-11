import {
  ArrowUpRight,
  LucideIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  icon: LucideIcon;
  value: string;
  footerLabel: string;
  delta?: {
    text: string;
    direction: "up" | "down" | "flat";
  } | null;
  highlighted?: boolean;
};

export default function StatTile({
  label,
  icon: Icon,
  value,
  footerLabel,
  delta,
  highlighted = false,
}: Props) {
  const Arrow = delta?.direction === "down" ? TrendingDown : TrendingUp;

  return (
    <div
      className={cn(
        "relative flex min-h-40 flex-col justify-between rounded-2xl p-4 transition-colors",
        highlighted
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-card-foreground",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-lg font-medium",
            highlighted ? "text-primary-foreground/90" : "text-foreground",
          )}
        >
          {label}
        </p>

        <button
          type="button"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors",
            highlighted
              ? "border-primary-foreground/20 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          <ArrowUpRight className="size-4" />
        </button>
      </div>

      {/* Value */}
      <p
        className={cn(
          "text-5xl font-semibold tracking-tight tabular-nums",
          highlighted ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {value}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            highlighted ? "text-primary-foreground/80" : "text-primary",
          )}
        />

        <span
          className={cn(
            "truncate text-xs",
            highlighted ? "text-primary-foreground/80" : "text-primary",
          )}
        >
          {footerLabel}
        </span>

        {delta && (
          <span
            className={cn(
              "ml-auto flex shrink-0 items-center gap-0.5 text-xs font-medium tabular-nums",
              highlighted
                ? "text-primary-foreground"
                : delta.direction === "up"
                  ? "text-primary"
                  : delta.direction === "down"
                    ? "text-destructive"
                    : "text-muted-foreground",
            )}
          >
            {delta.direction !== "flat" && <Arrow className="size-3" />}

            {delta.text}
          </span>
        )}
      </div>
    </div>
  );
}
