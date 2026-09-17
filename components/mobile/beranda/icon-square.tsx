import type { LucideIcon } from "lucide-react";

/**
 * Rounded-square icon container used for Beranda menu items. Mirrors
 * mobile's `components/ui/icon-square.tsx` — every item shares the same
 * box color, no per-item tinting.
 */
export function IconSquare({
  icon: LucideIconComponent,
  size = 48,
}: {
  icon: LucideIcon;
  size?: number;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className="bg-accent dark:border-border dark:bg-background flex items-center justify-center rounded-xl shadow-sm shadow-black/5 dark:border dark:shadow-none"
    >
      <LucideIconComponent
        size={size * 0.46}
        strokeWidth={2}
        className="text-primary"
      />
    </div>
  );
}
