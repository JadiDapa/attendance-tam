import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mirrors `mobile/src/components/icon.tsx`'s semantic tone system, but as
 * Tailwind classes instead of a light/dark hex lookup — the CSS vars already
 * handle dark mode, so there's no need to resolve a color value in JS.
 */
export type IconTone =
  | "default"
  | "muted"
  | "inverse"
  | "primary"
  | "success"
  | "warning"
  | "destructive";

const TONE_CLASS: Record<IconTone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  inverse: "text-primary-foreground",
  primary: "text-primary",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  destructive: "text-destructive",
};

/** Icon sizes tied to the app's 4px spacing scale — mirrors mobile's `IconSize`. */
export const IconSize = {
  /** Inline with caption/body text (text-xs / text-sm) */
  sm: 16,
  /** Default — inline with body text, row leading icons */
  md: 20,
  /** Section leading icons, avatar-adjacent icons */
  lg: 24,
  /** Icon-only buttons, empty-state illustrations */
  xl: 28,
} as const;

export function Icon({
  icon: LucideIconComponent,
  size = IconSize.md,
  tone = "default",
  className,
  strokeWidth = 2,
}: {
  icon: LucideIcon;
  size?: number;
  tone?: IconTone;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <LucideIconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={cn(TONE_CLASS[tone], className)}
    />
  );
}
