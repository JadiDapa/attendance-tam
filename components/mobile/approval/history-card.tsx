import { FileText, Timer, Briefcase, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { StatusBadge } from "@/components/mobile/status-badge";
import { formatShortDateNoYear } from "@/lib/date";
import type { ApprovalLogEntry } from "@/lib/mobile-queries";
import type { RequestStatus } from "@/components/mobile/beranda/request-card";

const API_STATUS_LABEL: Record<string, RequestStatus> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

const HISTORY_TYPE_ICON: Record<ApprovalLogEntry["type"], LucideIcon> = {
  LEAVE: FileText,
  OVERTIME: Timer,
  FIELD_ASSIGNMENT: Briefcase,
};

function formatTime(iso: string) {
  return iso.slice(11, 16);
}

/** Mirrors mobile's `HistoryCard` — already-reviewed item in the merged Approval feed. */
export function HistoryCard({ entry }: { entry: ApprovalLogEntry }) {
  return (
    <div className="bg-card flex flex-col gap-3 rounded-2xl p-3">
      <div className="flex items-center justify-between">
        <span className="text-foreground text-sm font-medium">
          {entry.requesterName}
        </span>
        <StatusBadge status={API_STATUS_LABEL[entry.status]} />
      </div>

      <div className="flex items-center gap-1.5">
        <Icon icon={HISTORY_TYPE_ICON[entry.type]} size={14} tone="muted" />
        <span className="text-muted-foreground line-clamp-1 flex-1 text-sm">
          {entry.summary}
        </span>
      </div>

      {entry.note && (
        <p className="text-muted-foreground line-clamp-3 text-sm">
          Catatan: {entry.note}
        </p>
      )}

      <span className="text-muted-foreground text-xs">
        Diputuskan {formatShortDateNoYear(entry.reviewedAt.slice(0, 10))},{" "}
        {formatTime(entry.reviewedAt)}
      </span>
    </div>
  );
}
