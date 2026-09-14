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
import { LeaveService } from "@/servers/services/leave.service";

/** Sakit selesai di admin — manager cuma mereview izin & cuti. */
const REVIEWABLE_TYPES: LeaveType[] = [LeaveType.IZIN, LeaveType.CUTI];

export default async function ManagerIzinPage() {
  await requireRole(Role.MANAGER);

  const requests = (await LeaveService.list()).filter((request) =>
    REVIEWABLE_TYPES.includes(request.type),
  );

  const rows: LeaveApprovalRow[] = requests.map((request) => ({
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

  const myTurn = requests.filter(
    (request) => request.status === "PENDING" && request.stage === LeaveStage.MANAGER,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengajuan Izin"
        subtitle="Setujui atau tolak pengajuan izin & cuti yang sudah disetujui admin & supervisor."
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
          value={String(requests.length)}
          footerLabel="Semua pengajuan izin & cuti"
        />
      </div>

      <LeaveApprovalTable
        rows={rows}
        viewerStage={LeaveStage.MANAGER}
        detailBasePath="/manager/izin"
      />
    </div>
  );
}
