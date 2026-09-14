import SelfAttendanceDashboard, {
  type SelfAttendanceSearchParams,
} from "@/components/dashboard/SelfAttendanceDashboard";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

export default async function SupervisorAbsensiSayaPage({
  searchParams,
}: {
  searchParams: Promise<SelfAttendanceSearchParams>;
}) {
  const user = await requireRole(Role.SUPERVISOR);

  return (
    <SelfAttendanceDashboard
      user={user}
      searchParams={await searchParams}
      basePath="/supervisor/absensi"
      title="Absensi Saya"
    />
  );
}
