"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ApprovalActions,
  showApprovalResult,
} from "@/components/mobile/approval/approval-actions";
import { StatColumn } from "@/components/mobile/stat-column";
import { StatusBadge } from "@/components/mobile/status-badge";
import { reviewLeaveRequest } from "@/app/action/leave.action";
import { LEAVE_TYPE_LABEL, LEAVE_REASON_CATEGORY_LABEL } from "@/lib/leave";
import { countDaysInclusive, formatShortDateNoYear } from "@/lib/date";
import type { ApiPendingLeaveRequest } from "@/lib/mobile-queries";
import type { RequestStatus } from "@/components/mobile/beranda/request-card";
import type { LeaveReasonCategory } from "@/generated/prisma";

const API_STATUS_LABEL: Record<string, RequestStatus> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

/** Mirrors mobile's `LeaveApprovalCard`. */
export function LeaveApprovalCard({
  request,
}: {
  request: ApiPendingLeaveRequest;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleReview(status: "APPROVED" | "REJECTED", reviewNote: string) {
    startTransition(async () => {
      const result = await reviewLeaveRequest(request.id, {
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
          {request.user.name}
        </span>
        <StatusBadge status={API_STATUS_LABEL[request.status]} />
      </div>

      <span className="text-muted-foreground text-xs">
        {LEAVE_TYPE_LABEL[request.type]}
        {request.reasonCategory
          ? ` · ${LEAVE_REASON_CATEGORY_LABEL[request.reasonCategory as LeaveReasonCategory]}`
          : ""}
      </span>

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

      {request.detail.length > 0 && (
        <p className="text-muted-foreground line-clamp-3 text-sm">
          {request.detail}
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
