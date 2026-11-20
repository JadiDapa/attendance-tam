import { BadgeIcon as ShieldCheck } from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import AttendanceApprovalTable, {
  type AttendanceApprovalRow,
} from "@/components/admin/AttendanceApprovalTable";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatTime, formatWorkDate } from "@/lib/date";
import { formatDistance } from "@/lib/geo";
import { ATTENDANCE_TYPE_LABEL } from "@/lib/attendance";
import { ApprovalRoutingService } from "@/servers/services/approval-routing.service";
import { AttendanceService } from "@/servers/services/attendance.service";
import { OfficeLocationService } from "@/servers/services/setting.service";

/**
 * Verifikasi absensi milik supervisor, plus absensi karyawan/admin di Divisi
 * yang tidak punya Supervisor Divisi aktif (cakupan dari
 * `ApprovalRoutingService.getScopeForReviewer`, ADR 0002).
 */
export default async function ManagerVerifikasiPage() {
  const reviewer = await requireRole(Role.MANAGER);
  const scope = await ApprovalRoutingService.getScopeForReviewer(reviewer);

  const [pending, office] = await Promise.all([
    AttendanceService.listPendingApprovalForScope(scope),
    OfficeLocationService.getActive(),
  ]);

  const radiusLabel = office ? `${office.radiusMeters} m` : "belum diatur";

  const rows: AttendanceApprovalRow[] = pending.map((attendance) => ({
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
    detail: attendance.workModeDetail,
    isLate: attendance.isLate,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Verifikasi Absensi"
        subtitle="Absensi supervisor di luar radius kantor. Tinjau alasannya, lalu setujui atau tolak."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Menunggu Keputusan"
          icon={ShieldCheck}
          value={String(pending.length)}
          footerLabel={`Radius kantor ${radiusLabel}`}
          highlighted={pending.length > 0}
        />
      </div>

      <AttendanceApprovalTable rows={rows} />
    </div>
  );
}
