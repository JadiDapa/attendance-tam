import { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import DashboardShell from "@/components/dashboard/DashboardShell";

/**
 * Despite the folder name, these routes (`/dashboard`, `/riwayat`, `/izin`,
 * `/lembur`, `/pengaturan`) are the mobile-parity core tabs (Beranda/Histori/
 * Izin/Lembur/Profile) — the RN app shows them to every role unconditionally
 * (only the Approval tab is role-gated), and the backend already supports
 * self-service leave/overtime for EMPLOYEE/ADMIN/SUPERVISOR/MANAGER alike.
 * Desktop only ever linked these from EMPLOYEE's own sidebar, so the
 * `hidden md:block` desktop tree inside each page is still EMPLOYEE-shaped
 * content — reachable by other roles only if they type the URL directly,
 * which was never part of their sidebar-driven desktop workflow.
 */
export default async function EmployeeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
