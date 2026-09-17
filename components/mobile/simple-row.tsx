import { ChevronRight, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { cn } from "@/lib/utils";

/** Mirrors mobile's `SimpleRow` — generic icon+label+subtitle+chevron nav row. */
export function SimpleRow({
  icon,
  label,
  subtitle,
  onPress,
  showBorder,
  destructive,
}: {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  showBorder: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "flex w-full items-center gap-3 py-3 text-left",
        showBorder && "border-border border-b",
      )}
    >
      <Icon
        icon={icon}
        size={20}
        tone={destructive ? "destructive" : "muted"}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "line-clamp-1 block text-sm font-medium",
            destructive ? "text-destructive" : "text-foreground",
          )}
        >
          {label}
        </span>
        {subtitle && (
          <span className="text-muted-foreground line-clamp-1 block text-xs">
            {subtitle}
          </span>
        )}
      </span>
      <Icon icon={ChevronRight} size={16} tone="primary" />
    </button>
  );
}
