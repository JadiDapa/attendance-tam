import { Card } from "@/components/mobile/card";
import { StatColumn } from "@/components/mobile/stat-column";
import { StatusBadge } from "@/components/mobile/status-badge";
import { TypeBadge, type LeaveType } from "@/components/mobile/izin/type-badge";
import { LEAVE_TYPE_LABEL, LEAVE_REASON_CATEGORY_LABEL } from "@/lib/leave";
import { countDaysInclusive, formatShortDateNoYear } from "@/lib/date";
import type { LeaveReasonCategory } from "@/generated/prisma";
import type { ApiLeaveRequest } from "@/lib/mobile-queries";
import type { RequestStatus } from "@/components/mobile/beranda/request-card";

const API_STATUS_LABEL: Record<ApiLeaveRequest["status"], RequestStatus> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

/** Mirrors mobile's `LeaveRequestCard`. */
export function LeaveRequestCard({ request }: { request: ApiLeaveRequest }) {
  const type = LEAVE_TYPE_LABEL[request.type] as LeaveType;
  const status = API_STATUS_LABEL[request.status];

  return (
    <Card className="gap-3 p-3">
      <div className="flex items-center justify-between">
        <TypeBadge type={type} />
        <StatusBadge status={status} />
      </div>

      <div className="flex">
        <StatColumn
          label="Mulai"
          value={formatShortDateNoYear(request.startDate)}
        />
        <StatColumn
          label="Selesai"
          value={formatShortDateNoYear(request.endDate)}
          divider
        />
        <StatColumn
          label="Durasi"
          value={`${countDaysInclusive(request.startDate, request.endDate)} Hari`}
          divider
        />
      </div>

      {request.reasonCategory && (
        <span className="text-muted-foreground text-xs font-medium">
          {
            LEAVE_REASON_CATEGORY_LABEL[
              request.reasonCategory as LeaveReasonCategory
            ]
          }
        </span>
      )}

      {request.detail.length > 0 && (
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {request.detail}
        </p>
      )}
    </Card>
  );
}
