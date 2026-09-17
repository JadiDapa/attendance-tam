import { cn } from "@/lib/utils";

const SHORT_DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Mirrors mobile's `DateBlock` — colored day-number chip doubling as a status indicator. */
export function DateBlock({
  iso,
  colorClassName,
}: {
  iso: string;
  colorClassName: string;
}) {
  const date = new Date(iso);

  return (
    <div
      className={cn(
        "flex w-20 shrink-0 flex-col items-center justify-center gap-1 self-stretch rounded-2xl py-4",
        colorClassName,
      )}
    >
      <span className="text-3xl font-bold text-white">{date.getUTCDate()}</span>
      <span className="text-xs font-medium text-white/90">
        {SHORT_DAY_NAMES[date.getUTCDay()]}
      </span>
    </div>
  );
}
