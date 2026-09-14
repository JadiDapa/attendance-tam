import SelfAttendanceDashboard, {
  type SelfAttendanceSearchParams,
} from "@/components/dashboard/SelfAttendanceDashboard";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

export default async function ManagerAbsensiSayaPage({
  searchParams,
}: {
  searchParams: Promise<SelfAttendanceSearchParams>;
}) {
  const user = await requireRole(Role.MANAGER);

  return (
    <SelfAttendanceDashboard
      user={user}
      searchParams={await searchParams}
      basePath="/manager/absensi"
      title="Absensi Saya"
    />
  );
}
