import SelfAttendanceDashboard, {
  type SelfAttendanceSearchParams,
} from "@/components/dashboard/SelfAttendanceDashboard";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

export default async function EmployeeDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SelfAttendanceSearchParams>;
}) {
  const user = await requireRole(Role.EMPLOYEE);

  return (
    <SelfAttendanceDashboard
      user={user}
      searchParams={await searchParams}
      basePath="/dashboard"
      title="Dashboard"
    />
  );
}
