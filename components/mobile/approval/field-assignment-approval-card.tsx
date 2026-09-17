"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Users } from "lucide-react";
import {
  ApprovalActions,
  showApprovalResult,
} from "@/components/mobile/approval/approval-actions";
import { Icon } from "@/components/mobile/icon";
import { StatusBadge } from "@/components/mobile/status-badge";
import { reviewFieldAssignment } from "@/app/action/field-assignment.action";
import { TRANSPORTATION_LABEL } from "@/lib/field-assignment";
import { formatShortDateNoYear } from "@/lib/date";
import type { ApiPendingFieldAssignment } from "@/lib/mobile-queries";
import type { RequestStatus } from "@/components/mobile/beranda/request-card";
import type { TransportationType } from "@/generated/prisma";

const API_STATUS_LABEL: Record<string, RequestStatus> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

/** Mirrors mobile's `FieldAssignmentApprovalCard`. */
export function FieldAssignmentApprovalCard({
  assignment,
}: {
  assignment: ApiPendingFieldAssignment;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const dateRange =
    assignment.startDate === assignment.endDate
      ? formatShortDateNoYear(assignment.startDate)
      : `${formatShortDateNoYear(assignment.startDate)} - ${formatShortDateNoYear(assignment.endDate)}`;

  function handleReview(status: "APPROVED" | "REJECTED", reviewNote: string) {
    startTransition(async () => {
      const result = await reviewFieldAssignment(assignment.id, {
        status,
        reviewNote: reviewNote || undefined,
      });
      showApprovalResult(result);
      router.refresh();
    });
  }

  return (
    <div className="bg-card flex flex-col gap-3 rounded-2xl p-3">
      <div className="flex items-center justify-between">
        <span className="text-foreground text-sm font-medium">
          {assignment.createdBy.name}
        </span>
        <StatusBadge status={API_STATUS_LABEL[assignment.status]} />
      </div>

      <span className="text-muted-foreground text-xs">{dateRange}</span>

      <div className="flex items-center gap-1.5">
        <Icon icon={MapPin} size={16} tone="muted" />
        <span className="text-muted-foreground line-clamp-1 flex-1 text-sm">
          {assignment.destinationCity}
          {assignment.transportation
            ? ` · ${TRANSPORTATION_LABEL[assignment.transportation as TransportationType]}`
            : ""}
        </span>
      </div>

      <div className="flex items-start gap-1.5">
        <Icon icon={Users} size={16} tone="muted" />
        <span className="text-muted-foreground line-clamp-2 flex-1 text-sm">
          {assignment.employees.map((e) => e.name).join(", ")}
        </span>
      </div>

      {assignment.activityDetail.length > 0 && (
        <p className="text-muted-foreground line-clamp-3 text-sm">
          {assignment.activityDetail}
        </p>
      )}

      <ApprovalActions
        submitting={isPending}
        onApprove={(note) => handleReview("APPROVED", note)}
        onReject={(note) => handleReview("REJECTED", note)}
      />
    </div>
  );
}
