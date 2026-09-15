import {
  CheckCircledIcon as CheckCircle2,
  ClockIcon as Clock4,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import OvertimeApprovalTable, {
  type OvertimeApprovalRow,
} from "@/components/overtime/OvertimeApprovalTable";
import { AttendanceApproval, OvertimeStage, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatDuration, formatTime, formatWorkDate, getWorkDate } from "@/lib/date";
import { OvertimeService } from "@/servers/services/overtime.service";

/**
 * Manager mereview lembur milik supervisor (giliran MANAGER) — pengajuan
 * karyawan/admin lain sudah diputuskan supervisornya masing-masing (lihat
 * `resolveInitialOvertime()` di `lib/overtime.ts`), jadi baris itu cuma
 * tampil sebagai "Detail" di sini, bukan "Tinjau".
 */
export default async function ManagerLemburPage() {
  await requireRole(Role.MANAGER);

  const requests = await OvertimeService.list();

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
  }));

  const myTurn = requests.filter(
    (request) =>
      request.status === AttendanceApproval.PENDING &&
      request.stage === OvertimeStage.MANAGER,
  ).length;

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
