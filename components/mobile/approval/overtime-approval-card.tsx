"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ApprovalActions,
  showApprovalResult,
} from "@/components/mobile/approval/approval-actions";
import { StatColumn } from "@/components/mobile/stat-column";
import { StatusBadge } from "@/components/mobile/status-badge";
import { reviewOvertime } from "@/app/action/overtime.action";
import type { ApiPendingOvertimeRequest } from "@/lib/mobile-queries";
import type { RequestStatus } from "@/components/mobile/beranda/request-card";

const API_STATUS_LABEL: Record<string, RequestStatus> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

function isoTime(iso: string) {
  return iso.slice(11, 16);
}

function durationLabel(fromIso: string, toIso: string | null) {
  if (!toIso) return "--:--";
  const minutes = Math.round(
    (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000,
  );
  if (minutes < 0) return "--:--";
  return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
}

/** Mirrors mobile's `OvertimeApprovalCard`. */
export function OvertimeApprovalCard({
  request,
}: {
  request: ApiPendingOvertimeRequest;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleReview(status: "APPROVED" | "REJECTED", reviewNote: string) {
    startTransition(async () => {
      const result = await reviewOvertime(request.id, {
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

      <div className="flex">
        <StatColumn label="Mulai" value={isoTime(request.startAt)} />
        <StatColumn
          label="Selesai"
          value={request.endAt ? isoTime(request.endAt) : "--:--"}
          divider
        />
        <StatColumn
          label="Durasi"
          value={durationLabel(request.startAt, request.endAt)}
          divider
        />
      </div>

      {request.reason.length > 0 && (
        <p className="text-muted-foreground line-clamp-3 text-sm">
          {request.reason}
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
