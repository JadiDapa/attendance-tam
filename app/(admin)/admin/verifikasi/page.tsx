import { MapPinOff, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import RadiusReviewTable, {
  type RadiusReviewRow,
} from "@/components/admin/RadiusReviewTable";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatTime, formatWorkDate } from "@/lib/date";
import { formatDistance } from "@/lib/geo";
import { ATTENDANCE_TYPE_LABEL } from "@/lib/correction";
import { AttendanceService } from "@/servers/services/attendance.service";
import { OfficeLocationService } from "@/servers/services/setting.service";

export default async function VerifikasiPage() {
  await requireRole(Role.ADMIN);

  const [pending, office] = await Promise.all([
    AttendanceService.listPendingReview(),
    OfficeLocationService.getActive(),
  ]);

  const radiusLabel = office ? `${office.radiusMeters} m` : "belum diatur";

  const rows: RadiusReviewRow[] = pending.map((attendance) => ({
    id: attendance.id,
    employeeName: attendance.user.name,
    employeePosition: attendance.user.position ?? "",
    dateLabel: formatWorkDate(attendance.workDate),
    typeLabel: ATTENDANCE_TYPE_LABEL[attendance.type],
    time: formatTime(attendance.timestamp),
    distanceLabel:
      attendance.distanceMeters != null
        ? formatDistance(attendance.distanceMeters)
        : "tidak diketahui",
    accuracyLabel:
      attendance.accuracyMeters != null
        ? `±${formatDistance(attendance.accuracyMeters)}`
        : "tidak tercatat",
    officeRadiusLabel: radiusLabel,
    photoUrl: attendance.photoUrl,
    mapUrl:
      attendance.latitude != null && attendance.longitude != null
        ? `https://www.google.com/maps?q=${attendance.latitude},${attendance.longitude}`
        : null,
    status: attendance.reviewStatus!,
    reviewNote: attendance.reviewNote,
    reviewedBy: null,
  }));

  const farthest = pending.reduce(
    (max, item) => Math.max(max, item.distanceMeters ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Verifikasi Lokasi"
        subtitle="Absensi yang terekam di luar radius kantor belum dihitung hadir sampai kamu memutuskannya."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Menunggu Verifikasi"
          icon={ShieldCheck}
          value={String(pending.length)}
          footerLabel={`Radius kantor ${radiusLabel}`}
        />
        <StatTile
          label="Jarak Terjauh"
          icon={MapPinOff}
          value={farthest > 0 ? formatDistance(farthest) : "—"}
          footerLabel="Dari titik kantor yang aktif"
        />
      </div>

      <RadiusReviewTable rows={rows} />
    </div>
  );
}
