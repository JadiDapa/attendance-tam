import { EmployeeDataScreen } from "@/components/mobile/employee-data/employee-data-screen";
import { requireUser } from "@/lib/session";

// Mirrors `mobile/src/app/employee-data.tsx` (hub) — links to 6 sub-forms +
// read-only payroll.
export default async function DataKepegawaianPage() {
  const user = await requireUser();

  return <EmployeeDataScreen role={user.role} />;
}
