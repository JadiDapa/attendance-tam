import SelfOvertimeDashboard from "@/components/dashboard/SelfOvertimeDashboard";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

export default async function AdminLemburSayaPage() {
  const user = await requireRole(Role.ADMIN);

  return (
    <SelfOvertimeDashboard
      user={user}
      subtitle="Ajukan lembur untuk diri sendiri — menunggu persetujuan supervisor."
    />
  );
}
