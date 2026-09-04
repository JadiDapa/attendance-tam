import type { ComponentType } from "react";
import {
  ExternalLinkIcon as ArrowUpRight,
  ArrowBottomRightIcon as TrendingDown,
  ArrowTopRightIcon as TrendingUp,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

type Icon = ComponentType<{ className?: string }>;

type Props = {
  label: string;
  icon: Icon;
  value: string;
  /** Opsional — kartu status hanya menampilkan angkanya saja. */
  footerLabel?: string;
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
        "relative flex min-h-32 flex-col justify-between gap-3 rounded-xl p-3.5 transition-colors sm:min-h-40 sm:p-4",
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
          "text-3xl font-semibold tracking-tight tabular-nums sm:text-5xl",
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
            highlighted ? "text-primary-foreground/80" : "text-primary-subtle",
          )}
        />

        <span
          className={cn(
            "truncate text-xs",
            highlighted ? "text-primary-foreground/80" : "text-primary-subtle",
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
                  ? "text-primary-subtle"
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
