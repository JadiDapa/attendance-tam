import { DateBlock } from "@/components/mobile/date-block";
import { StatColumn } from "@/components/mobile/stat-column";
import { StatusBadge } from "@/components/mobile/status-badge";
import type { RequestStatus } from "@/components/mobile/beranda/request-card";

export type OvertimeRequest = {
  id: string;
  date: string; // ISO yyyy-MM-dd
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  duration: string;
  reason: string;
  status: RequestStatus;
};

const STATUS_DATE_BLOCK_CLASSES: Record<RequestStatus, string> = {
  Menunggu: "bg-amber-600",
  Disetujui: "bg-emerald-700",
  Ditolak: "bg-red-600",
};

/** Mirrors mobile's `OvertimeRequestCard`. */
export function OvertimeRequestCard({ request }: { request: OvertimeRequest }) {
  return (
    <div className="bg-card flex gap-3 rounded-2xl p-3">
      <DateBlock
        iso={request.date}
        colorClassName={STATUS_DATE_BLOCK_CLASSES[request.status]}
      />

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
        <div className="flex">
          <StatColumn label="Mulai" value={request.start} />
          <StatColumn label="Selesai" value={request.end} divider />
          <StatColumn label="Durasi" value={request.duration} divider />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground line-clamp-1 flex-1 text-sm">
            {request.reason}
          </span>
          <StatusBadge status={request.status} />
        </div>
      </div>
    </div>
  );
}
