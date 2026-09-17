import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/mobile/card";
import { Icon } from "@/components/mobile/icon";
import { cn } from "@/lib/utils";

export type RequestStatus = "Menunggu" | "Disetujui" | "Ditolak";

const STATUS_TEXT_CLASSES: Record<RequestStatus, string> = {
  Menunggu: "text-amber-600 dark:text-amber-400",
  Disetujui: "text-green-600 dark:text-green-400",
  Ditolak: "text-red-600 dark:text-red-400",
};

/** `date` is a raw ISO timestamp — the row renders its own day/month chip from it. */
export type SummaryRequest = {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  status: RequestStatus;
};

function DateChip({ iso }: { iso: string }) {
  const parsed = new Date(iso);
  const day = parsed.getDate();
  const month = parsed
    .toLocaleDateString("id-ID", { month: "short", timeZone: "UTC" })
    .toUpperCase()
    .replace(".", "");

  return (
    <div className="bg-accent dark:border-border dark:bg-background flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl dark:border">
      <span className="text-primary text-[10px] font-bold tracking-wide uppercase">
        {month}
      </span>
      <span className="text-foreground text-lg leading-5 font-bold">{day}</span>
    </div>
  );
}

function RequestRow({
  title,
  subtitle,
  date,
  status,
  showDivider,
}: SummaryRequest & { showDivider: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3",
        showDivider && "border-border border-b",
      )}
    >
      <DateChip iso={date} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {subtitle && (
          <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            {subtitle}
          </span>
        )}
        <span className="text-foreground line-clamp-2 text-sm leading-5 font-semibold">
          {title}
        </span>
      </div>

      <div className="border-border shrink-0 rounded-md border px-2 py-1">
        <span
          className={cn(
            "text-[11px] font-semibold",
            STATUS_TEXT_CLASSES[status],
          )}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

/** Mirrors mobile's `RequestListGroup` — used for the 3 "recent requests" sections on Beranda. */
export function RequestListGroup({
  items,
  icon,
  emptyLabel,
}: {
  items: SummaryRequest[];
  icon: LucideIcon;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <Card className="flex-row items-center gap-3 px-4 py-5">
        <Icon icon={icon} size={18} tone="muted" />
        <span className="text-muted-foreground flex-1 text-sm">
          {emptyLabel}
        </span>
      </Card>
    );
  }

  return (
    <Card className="px-4">
      {items.map((item, index) => (
        <RequestRow
          key={item.id}
          showDivider={index < items.length - 1}
          {...item}
        />
      ))}
    </Card>
  );
}
