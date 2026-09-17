import { MapPin, Users } from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { StatusBadge } from "@/components/mobile/status-badge";
import { TRANSPORTATION_LABEL } from "@/lib/field-assignment";
import { formatShortDateNoYear } from "@/lib/date";
import type { ApiFieldAssignment } from "@/lib/mobile-queries";
import type { RequestStatus } from "@/components/mobile/beranda/request-card";
import type { TransportationType } from "@/generated/prisma";

const API_STATUS_LABEL: Record<ApiFieldAssignment["status"], RequestStatus> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

/** Mirrors mobile's `FieldAssignmentCard` — read-only, approve/reject lives on desktop web (manager). */
export function FieldAssignmentCard({
  assignment,
  showEmployees = true,
}: {
  assignment: ApiFieldAssignment;
  showEmployees?: boolean;
}) {
  const status = API_STATUS_LABEL[assignment.status];
  const dateRange =
    assignment.startDate === assignment.endDate
      ? formatShortDateNoYear(assignment.startDate)
      : `${formatShortDateNoYear(assignment.startDate)} - ${formatShortDateNoYear(assignment.endDate)}`;

  return (
    <div className="bg-card flex flex-col gap-3 rounded-2xl p-3">
      <div className="flex items-center justify-between">
        <span className="text-foreground text-sm font-medium">{dateRange}</span>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-center gap-1.5">
        <Icon icon={MapPin} size={16} tone="muted" />
        <span className="text-muted-foreground line-clamp-1 flex-1 text-sm">
          {assignment.destinationCity ?? "-"}
          {assignment.transportation
            ? ` · ${TRANSPORTATION_LABEL[assignment.transportation as TransportationType]}`
            : ""}
        </span>
      </div>

      {showEmployees && (
        <div className="flex items-start gap-1.5">
          <Icon icon={Users} size={16} tone="muted" />
          <span className="text-muted-foreground line-clamp-2 flex-1 text-sm">
            {assignment.employees.map((employee) => employee.name).join(", ")}
          </span>
        </div>
      )}

      {assignment.activityDetail.length > 0 && (
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {assignment.activityDetail}
        </p>
      )}

      {assignment.reviewNote && (
        <p className="text-muted-foreground line-clamp-2 text-xs">
          Catatan: {assignment.reviewNote}
        </p>
      )}
    </div>
  );
}
