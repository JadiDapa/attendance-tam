import { cn } from "@/lib/utils";

/** Mirrors mobile's `StatsRow` — horizontal stat summary bar. */
export function StatsRow({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <div className="bg-muted flex rounded-2xl">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 px-2 py-3",
            index !== 0 && "border-border border-l",
          )}
        >
          <span className="text-foreground text-lg font-semibold">
            {item.value}
          </span>
          <span className="text-muted-foreground line-clamp-1 text-center text-xs">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
