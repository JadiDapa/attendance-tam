import SelfAttendanceDashboard, {
  type SelfAttendanceSearchParams,
} from "@/components/dashboard/SelfAttendanceDashboard";
import { MobileHome } from "@/components/mobile/beranda/home";
import { requireUser } from "@/lib/session";

// Mirrors the RN app's Beranda tab — shown to every role, not just EMPLOYEE
// (see CLAUDE.md "Mobile parity project"). The desktop tree below is only
// ever linked from EMPLOYEE's own sidebar; other roles reach this URL only
// via the mobile tab bar.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SelfAttendanceSearchParams>;
}) {
  const user = await requireUser();

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
