import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Mirrors mobile's `FormInput` — plain `bg-muted` field, no border. */
export function FormInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "bg-muted text-foreground w-full rounded-xl px-4 py-3 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function FormTextarea({
  className,
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "bg-muted text-foreground w-full rounded-xl px-4 py-3 text-sm",
        className,
      )}
      {...props}
    />
  );
}
