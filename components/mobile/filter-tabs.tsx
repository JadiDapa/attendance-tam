import { cn } from "@/lib/utils";

/** Mirrors mobile's `FilterTabs` — horizontal pill selector used on every list screen. */
export function FilterTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "min-w-21 shrink-0 rounded-full px-4 py-2 text-center text-sm",
            tab === active
              ? "bg-primary text-primary-foreground font-medium"
              : "bg-muted text-muted-foreground",
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
