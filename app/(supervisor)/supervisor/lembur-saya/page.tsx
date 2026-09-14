import SelfOvertimeDashboard from "@/components/dashboard/SelfOvertimeDashboard";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

export default async function SupervisorLemburSayaPage() {
  const user = await requireRole(Role.SUPERVISOR);

  return (
    <SelfOvertimeDashboard
      user={user}
      subtitle="Ajukan lembur untuk diri sendiri — otomatis disetujui."
    />
  );
}
