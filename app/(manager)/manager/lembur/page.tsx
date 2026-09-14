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
 * Oversight lembur untuk manager — read-only. Manager tidak ikut rantai
 * approval lembur (cuma ADMIN -> SUPERVISOR -> DONE), jadi halaman ini murni
 * untuk memantau, termasuk pengajuan supervisor yang otomatis disetujui
 * tanpa direview siapa pun (lihat `resolveInitialOvertime()` di
 * `lib/overtime.ts`). `viewerStage: DONE` di tabel/detail membuat semuanya
 * tampil sebagai "Detail", bukan "Tinjau" — tidak ada aksi approve/reject di
 * sini.
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

  const pending = requests.filter(
    (request) => request.status === AttendanceApproval.PENDING,
  ).length;
  const approved = requests.filter(
    (request) => request.status === AttendanceApproval.APPROVED,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Lembur"
        subtitle="Pantau seluruh pengajuan lembur admin & supervisor."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Menunggu"
          icon={Clock4}
          value={String(pending)}
          footerLabel="Belum diputuskan admin/supervisor"
        />
        <StatTile
          label="Disetujui"
          icon={CheckCircle2}
          value={String(approved)}
          footerLabel="Termasuk pengajuan supervisor yang otomatis disetujui"
          highlighted
        />
      </div>

      <OvertimeApprovalTable
        rows={rows}
        viewerStage={OvertimeStage.DONE}
        detailBasePath="/manager/lembur"
      />
    </div>
  );
}
