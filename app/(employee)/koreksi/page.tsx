import { AlertTriangle, ClipboardList } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import CorrectionRequestForm from "@/components/employee/CorrectionRequestForm";
import CorrectionRequestTable, {
  type CorrectionRow,
} from "@/components/employee/CorrectionRequestTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CorrectionStatus, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { ATTENDANCE_TYPE_LABEL } from "@/lib/correction";
import { buildAttendanceDays } from "@/lib/attendance-days";
import {
  formatWorkDate,
  getMonthRange,
  getWorkDate,
  toDateInputValue,
} from "@/lib/date";
import { CorrectionService } from "@/servers/services/correction.service";
import { ReportService } from "@/servers/services/report.service";

export default async function KoreksiPage() {
  const user = await requireRole(Role.EMPLOYEE);

  const today = getWorkDate();
  const month = getMonthRange(today);

  const [corrections, rows] = await Promise.all([
    CorrectionService.list({ userId: user.id }),
    ReportService.buildRecap({
      startDate: month.startDate,
      endDate: month.endDate,
      userId: user.id,
    }),
  ]);

  const days = buildAttendanceDays({
    rows,
    startDate: month.startDate,
    endDate: month.endDate,
    today,
  });

  // Hari yang layak dikoreksi: absen pulangnya menggantung, atau hari kerja
  // yang terlewat sama sekali. Hari libur dan hari berjalan tidak dihitung.
  const needsAttention = days.filter(
    (day) => day.missingCheckOut || (day.status === "ALPA" && day.isPast),
  );

  const correctionRows: CorrectionRow[] = corrections.map((correction) => ({
    id: correction.id,
    dateLabel: formatWorkDate(correction.workDate),
    typeLabel: ATTENDANCE_TYPE_LABEL[correction.type],
    requestedTime: correction.requestedTime,
    reason: correction.reason,
    status: correction.status,
    reviewNote: correction.reviewNote,
    reviewedBy: correction.reviewedBy?.name ?? null,
    createdAt: formatWorkDate(getWorkDate(correction.createdAt)),
  }));

  const countByStatus = (status: CorrectionStatus) =>
    corrections.filter((correction) => correction.status === status).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Koreksi Absensi"
          subtitle="Ajukan perbaikan untuk absensi yang tidak sempat tercatat."
        />
        <CorrectionRequestForm today={toDateInputValue(today)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Menunggu</p>
            <p className="text-2xl font-bold">
              {countByStatus(CorrectionStatus.PENDING)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Disetujui</p>
            <p className="text-2xl font-bold">
              {countByStatus(CorrectionStatus.APPROVED)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Ditolak</p>
            <p className="text-2xl font-bold">
              {countByStatus(CorrectionStatus.REJECTED)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Panel
        title="Perlu Dikoreksi Bulan Ini"
        icon={AlertTriangle}
        action={
          <span className="text-muted-foreground shrink-0 text-sm">
            {formatWorkDate(month.startDate)} — {formatWorkDate(month.endDate)}
          </span>
        }
        contentClassName="flex flex-col gap-2 p-4"
      >
        {needsAttention.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Tidak ada absensi yang menggantung. Semua sudah tercatat.
          </p>
        ) : (
          needsAttention.map((day) => (
            <div
              key={day.key}
              className="border-border flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{day.dateLabel}</p>
                <p className="text-muted-foreground text-xs">
                  {day.missingCheckOut
                    ? `Absen masuk ${day.checkIn?.time ?? ""} · ${ATTENDANCE_TYPE_LABEL.CHECK_OUT.toLowerCase()} tidak tercatat`
                    : "Tidak ada absensi sama sekali"}
                </p>
              </div>
              <Badge variant="destructive" className="shrink-0">
                {day.missingCheckOut ? "Belum absen pulang" : "Tidak absen"}
              </Badge>
            </div>
          ))
        )}
      </Panel>

      <Panel
        title="Riwayat Pengajuan"
        icon={ClipboardList}
        contentClassName="p-4"
      >
        <CorrectionRequestTable rows={correctionRows} />
      </Panel>
    </div>
  );
}
