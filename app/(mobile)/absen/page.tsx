import { AttendanceCaptureScreen } from "@/components/mobile/attendance-capture-screen";
import { getFaceEnrollmentStatus } from "@/app/action/face.action";
import {
  OfficeLocationService,
  WorkScheduleService,
} from "@/servers/services/setting.service";
import { requireUser } from "@/lib/session";
import { AttendanceType } from "@/generated/prisma";

export default async function AbsenPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireUser();

  const { type: typeParam } = await searchParams;
  const type =
    typeParam === "CHECK_OUT" ? AttendanceType.CHECK_OUT : AttendanceType.CHECK_IN;
  const label = type === AttendanceType.CHECK_IN ? "Absen Masuk" : "Absen Pulang";

  const [faceStatus, office, schedule] = await Promise.all([
    getFaceEnrollmentStatus(),
    OfficeLocationService.getActive(),
    WorkScheduleService.getActive(),
  ]);

  return (
    <AttendanceCaptureScreen
      type={type}
      label={label}
      faceEnrolled={faceStatus.enrolled}
      office={office}
      maxAccuracyMeters={schedule?.maxAccuracyMeters ?? 100}
    />
  );
}
