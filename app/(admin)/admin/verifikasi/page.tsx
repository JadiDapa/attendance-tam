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
import { AttendanceService } from "@/servers/services/attendance.service";
import { OfficeLocationService } from "@/servers/services/setting.service";

export default async function ApprovalAbsensiPage() {
  await requireRole(Role.ADMIN);

  const [pending, office] = await Promise.all([
    AttendanceService.listPendingApproval(),
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
        title="Approval Absensi"
        subtitle="Karyawan yang absen langsung ke lokasi kerja tanpa lewat kantor, di luar radius kantor. Tinjau alasannya, lalu setujui atau tolak — beda dari Dinas Luar yang diajukan supervisor di muka."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Menunggu Approval"
          icon={ShieldCheck}
          value={String(pending.length)}
          footerLabel={`Radius kantor ${radiusLabel}`}
        />
      </div>

      <AttendanceApprovalTable rows={rows} />
    </div>
  );
}
