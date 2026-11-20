import {
  CheckCircledIcon as CheckCircle2,
  ClockIcon as Clock4,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import LeaveApprovalTable, {
  type LeaveApprovalRow,
} from "@/components/leave/LeaveApprovalTable";
import { LeaveStage, LeaveType, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatWorkDate, getWorkDate } from "@/lib/date";
import { countLeaveDays, LEAVE_TYPE_LABEL } from "@/lib/leave";
import { ApprovalRoutingService } from "@/servers/services/approval-routing.service";
import { LeaveService } from "@/servers/services/leave.service";

const REVIEWABLE_TYPES: LeaveType[] = [
  LeaveType.IZIN,
  LeaveType.CUTI,
  LeaveType.SAKIT,
];

export default async function SupervisorIzinPage() {
  const user = await requireRole(Role.SUPERVISOR);

  const [requests, scope] = await Promise.all([
    LeaveService.listForViewer(user),
    ApprovalRoutingService.getScopeForReviewer(user),
  ]);

  const filteredRequests = requests.filter((request) =>
    REVIEWABLE_TYPES.includes(request.type),
  );

  const rows: LeaveApprovalRow[] = filteredRequests.map((request) => ({
    id: request.id,
    employeeName: request.user.name,
    employeePosition: request.user.position ?? "",
    typeLabel: LEAVE_TYPE_LABEL[request.type],
    dateRange:
      request.startDate.getTime() === request.endDate.getTime()
        ? formatWorkDate(request.startDate)
        : `${formatWorkDate(request.startDate)} — ${formatWorkDate(request.endDate)}`,
    days: countLeaveDays(request.startDate, request.endDate),
    detail: request.detail,
    reasonCategory: request.reasonCategory,
    status: request.status,
    stage: request.stage,
    reviewNote: request.reviewNote,
    reviewedBy: request.reviewedBy?.name ?? null,
    attachmentUrl: request.attachmentUrl,
    createdAt: formatWorkDate(getWorkDate(request.createdAt)),
  }));

  const myTurn = await LeaveService.countPendingForScope(scope);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengajuan Izin"
        subtitle="Setujui atau tolak pengajuan izin, cuti & sakit karyawan."
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
          label="Total Izin & Cuti"
          icon={CheckCircle2}
          value={String(filteredRequests.length)}
          footerLabel="Semua pengajuan izin & cuti"
        />
      </div>

      <LeaveApprovalTable
        rows={rows}
        viewerStage={LeaveStage.SUPERVISOR}
        detailBasePath="/supervisor/izin"
      />
    </div>
  );
}
