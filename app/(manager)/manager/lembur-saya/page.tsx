import SelfOvertimeDashboard from "@/components/dashboard/SelfOvertimeDashboard";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

export default async function ManagerLemburSayaPage() {
  const user = await requireRole(Role.MANAGER);

  return (
    <SelfOvertimeDashboard
      user={user}
      subtitle="Ajukan lembur untuk diri sendiri — otomatis disetujui."
    />
  );
}
