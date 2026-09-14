import {
  CheckCircledIcon as CheckCircle2,
  ClockIcon as Clock4,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import SelfOvertimeForm from "@/components/overtime/SelfOvertimeForm";
import SelfOvertimeActiveCard from "@/components/overtime/SelfOvertimeActiveCard";
import SelfOvertimeTable, {
  type SelfOvertimeRow,
} from "@/components/overtime/SelfOvertimeTable";
import { AttendanceApproval, type User } from "@/generated/prisma";
import { formatDuration, formatTime, formatWorkDate, getWorkDate } from "@/lib/date";
import { OvertimeService } from "@/servers/services/overtime.service";

/**
 * Dashboard lembur diri sendiri — dipakai admin di `/admin/lembur-saya` dan
 * supervisor di `/supervisor/lembur-saya`. Beda dari halaman review
 * (`/admin/lembur`, `/supervisor/lembur`) yang menilai pengajuan orang lain,
 * ini murni untuk mengajukan & memantau lembur milik mereka sendiri — lihat
 * `resolveInitialOvertime()` di `lib/overtime.ts` untuk aturan giliran
 * approvalnya (admin lewat supervisor, supervisor disetujui otomatis).
 */
export default async function SelfOvertimeDashboard({
  user,
  subtitle,
}: {
  user: User;
  subtitle: string;
}) {
  const requests = await OvertimeService.list({ userId: user.id });
  const open = requests.find((request) => !request.endAt) ?? null;

  const rows: SelfOvertimeRow[] = requests.map((request) => ({
    id: request.id,
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Lembur Saya" subtitle={subtitle} />
        {!open && <SelfOvertimeForm />}
      </div>

      {open && (
        <SelfOvertimeActiveCard
          dateLabel={formatWorkDate(getWorkDate(open.startAt))}
          startTime={formatTime(open.startAt)}
          reason={open.reason}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Menunggu"
          icon={Clock4}
          value={String(pending)}
          footerLabel="Pengajuan belum diputuskan"
        />
        <StatTile
          label="Disetujui"
          icon={CheckCircle2}
          value={String(approved)}
          footerLabel="Pengajuan lembur yang disetujui"
          highlighted
        />
      </div>

      <SelfOvertimeTable rows={rows} />
    </div>
  );
}
