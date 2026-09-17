import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Primary content-card surface. Mirrors mobile's `components/ui/card.tsx`
 * (`rounded-card border border-border bg-card shadow-sm shadow-black/5
 * dark:shadow-none`).
 */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-card border-border bg-card flex flex-col border shadow-sm shadow-black/5 dark:shadow-none",
        className,
      )}
      {...props}
    />
  );
}
