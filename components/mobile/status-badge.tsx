import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/components/mobile/beranda/request-card";

const STATUS_DOT_CLASSES: Record<RequestStatus, string> = {
  Menunggu: "bg-amber-500",
  Disetujui: "bg-green-500",
  Ditolak: "bg-red-500",
};

const STATUS_TEXT_CLASSES: Record<RequestStatus, string> = {
  Menunggu: "text-amber-600 dark:text-amber-400",
  Disetujui: "text-green-600 dark:text-green-400",
  Ditolak: "text-red-600 dark:text-red-400",
};

/** Mirrors mobile's `StatusBadge` — colored dot + label. */
export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn("size-1.5 rounded-full", STATUS_DOT_CLASSES[status])}
      />
      <span className={cn("text-xs font-medium", STATUS_TEXT_CLASSES[status])}>
        {status}
      </span>
    </div>
  );
}
