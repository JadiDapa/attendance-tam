import SelfAttendanceDashboard, {
  type SelfAttendanceSearchParams,
} from "@/components/dashboard/SelfAttendanceDashboard";
import { MobileHome } from "@/components/mobile/beranda/home";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

export default async function EmployeeDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SelfAttendanceSearchParams>;
}) {
  const user = await requireRole(Role.EMPLOYEE);

  return (
    <>
      <MobileHome user={user} />

      <div className="hidden md:block">
        <SelfAttendanceDashboard
          user={user}
          searchParams={await searchParams}
          basePath="/dashboard"
          title="Dashboard"
        />
      </div>
    </>
  );
}
