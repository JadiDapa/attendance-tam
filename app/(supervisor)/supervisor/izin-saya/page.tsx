import IzinPage from "@/app/(employee)/izin/page";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

export default async function SupervisorIzinSayaPage() {
  await requireRole(Role.SUPERVISOR);

  return <IzinPage />;
}

