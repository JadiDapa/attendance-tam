import { Briefcase, House, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import AttendanceApprovalTable, {
  type AttendanceApprovalRow,
} from "@/components/admin/AttendanceApprovalTable";
import { Role, WorkMode } from "@/generated/prisma";
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
    claimedMode: attendance.workMode,
    detail: attendance.workModeDetail,
    isLate: attendance.isLate,
  }));

  const wfhCount = pending.filter(
    (item) => item.workMode === WorkMode.WFH,
  ).length;
  const dinasCount = pending.filter(
    (item) => item.workMode === WorkMode.DINAS_LUAR,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Approval Absensi"
        subtitle="Absensi di luar radius kantor menunggu keputusanmu. Karyawan sudah menyatakan alasannya — setujui, ubah modenya, atau tolak."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Menunggu Approval"
          icon={ShieldCheck}
          value={String(pending.length)}
          footerLabel={`Radius kantor ${radiusLabel}`}
        />
        <StatTile
          label="Klaim WFH"
          icon={House}
          value={String(wfhCount)}
          footerLabel="Bekerja dari rumah"
        />
        <StatTile
          label="Klaim Dinas Luar"
          icon={Briefcase}
          value={String(dinasCount)}
          footerLabel="Tugas di luar kantor"
        />
      </div>

      <AttendanceApprovalTable rows={rows} />
    </div>
  );
}
