import { LemburScreen } from "@/components/mobile/lembur/lembur-screen";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

// Mirrors `mobile/src/app/(tabs)/(lembur)/index.tsx`. New route — no existing
// EMPLOYEE-role desktop overtime self-service page (see MOBILE_PARITY.md
// decision #2). Calls the same `startOvertime`/`endOvertime` server actions
// the other roles' `lembur-saya` pages already use.
export default async function EmployeeLemburPage() {
  const user = await requireRole(Role.EMPLOYEE);

  return <LemburScreen role={user.role} />;
}
