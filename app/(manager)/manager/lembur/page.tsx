import {
  CheckCircledIcon as CheckCircle2,
  ClockIcon as Clock4,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import OvertimeApprovalTable, {
  type OvertimeApprovalRow,
} from "@/components/overtime/OvertimeApprovalTable";
import { OvertimeStage, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatDuration, formatTime, formatWorkDate, getWorkDate } from "@/lib/date";
import { isTurnToReview } from "@/lib/approval-routing";
import { ApprovalRoutingService } from "@/servers/services/approval-routing.service";
import { OvertimeService } from "@/servers/services/overtime.service";

/**
 * Manager mereview lembur milik supervisor (giliran MANAGER) atau pengajuan
 * dari Divisi tanpa Supervisor Divisi aktif.
 */
export default async function ManagerLemburPage() {
  const user = await requireRole(Role.MANAGER);

  const [requests, scope] = await Promise.all([
    OvertimeService.list(),
    ApprovalRoutingService.getScopeForReviewer(user),
  ]);

  const rows: OvertimeApprovalRow[] = requests.map((request) => ({
    id: request.id,
    employeeName: request.user.name,
    employeePosition: request.user.position ?? "",
    dateLabel: formatWorkDate(getWorkDate(request.startAt)),
    startTime: formatTime(request.startAt),
    endTime: request.endAt ? formatTime(request.endAt) : null,
    durationLabel: request.endAt
      ? formatDuration(request.startAt, request.endAt)
      : null,
    reason: request.reason,
    status: request.status,
    stage: request.stage,
    reviewNote: request.reviewNote,
    reviewedBy: request.reviewedBy?.name ?? null,
    isMyTurn: isTurnToReview({
      scope,
      target: {
        status: request.status,
        stage: request.stage,
        requesterDivisionId: request.user.jobPosition?.divisionId ?? null,
      },
    }),
  }));

  const myTurn = await OvertimeService.countPendingForScope(scope);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengajuan Lembur"
        subtitle="Setujui atau tolak pengajuan lembur milik supervisor — pengajuan karyawan lain sudah diputuskan supervisornya masing-masing."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Giliran Saya"
          icon={Clock4}
          value={String(myTurn)}
          footerLabel="Pengajuan menunggu keputusan Anda"
          highlighted={myTurn > 0}
        />
        <StatTile
          label="Total Lembur"
          icon={CheckCircle2}
          value={String(requests.length)}
          footerLabel="Semua pengajuan lembur"
        />
      </div>

      <OvertimeApprovalTable
        rows={rows}
        viewerStage={OvertimeStage.MANAGER}
        detailBasePath="/manager/lembur"
      />
    </div>
  );
}
