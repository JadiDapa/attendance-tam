import SelfAttendanceDashboard, {
  type SelfAttendanceSearchParams,
} from "@/components/dashboard/SelfAttendanceDashboard";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

export default async function AdminAbsensiSayaPage({
  searchParams,
}: {
  searchParams: Promise<SelfAttendanceSearchParams>;
}) {
  const user = await requireRole(Role.ADMIN);

  return (
    <SelfAttendanceDashboard
      user={user}
      searchParams={await searchParams}
      basePath="/admin/absensi"
      title="Absensi Saya"
    />
  );
}
