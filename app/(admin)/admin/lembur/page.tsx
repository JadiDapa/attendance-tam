import {
  CheckCircledIcon as CheckCircle2,
  ClockIcon as Clock4,
  CrossCircledIcon as XCircle,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import OvertimeApprovalTable, {
  type OvertimeApprovalRow,
} from "@/components/overtime/OvertimeApprovalTable";
import { AttendanceApproval, OvertimeStage, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import {
  formatDuration,
  formatTime,
  formatWorkDate,
  getWorkDate,
} from "@/lib/date";
import { OvertimeService } from "@/servers/services/overtime.service";

export default async function AdminLemburPage() {
  await requireRole(Role.ADMIN);

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
    editedByAdmin: request.editedById !== null,
    originalStartTime: request.originalStartAt
      ? formatTime(request.originalStartAt)
      : null,
    originalEndTime: request.originalEndAt
      ? formatTime(request.originalEndAt)
      : null,
  }));

  const pending = requests.filter(
    (request) => request.status === AttendanceApproval.PENDING,
  ).length;
  const approved = requests.filter(
    (request) => request.status === AttendanceApproval.APPROVED,
  ).length;
  const rejected = requests.filter(
    (request) => request.status === AttendanceApproval.REJECTED,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back
        title="Pengajuan Lembur"
        subtitle="Pantau pengajuan lembur karyawan — disetujui oleh supervisor atau manager. Admin dapat mengoreksi jam lembur yang salah."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Menunggu"
          icon={Clock4}
          value={String(pending)}
          footerLabel="Belum diputuskan supervisor/manager"
          highlighted={pending > 0}
        />
        <StatTile
          label="Disetujui"
          icon={CheckCircle2}
          value={String(approved)}
          footerLabel="Sudah disetujui supervisor & manager"
        />
        <StatTile
          label="Ditolak"
          icon={XCircle}
          value={String(rejected)}
          footerLabel="Pengajuan yang ditolak"
        />
      </div>

      {/* Admin tidak lagi ikut approval — DONE membuat tabel ini selalu view-only. */}
      <OvertimeApprovalTable
        rows={rows}
        viewerStage={OvertimeStage.DONE}
        detailBasePath="/admin/lembur"
        canEdit
      />
    </div>
  );
}
