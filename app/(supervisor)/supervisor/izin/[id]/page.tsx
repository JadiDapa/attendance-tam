import { notFound } from "next/navigation";
import LeaveDetailView from "@/components/leave/LeaveDetailView";
import { LeaveStage, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { LeaveService } from "@/servers/services/leave.service";

export default async function SupervisorIzinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.SUPERVISOR);

  const { id } = await params;
  const leave = await LeaveService.getById(id);

  if (!leave) notFound();

  return (
    <LeaveDetailView
      leave={leave}
      viewerStage={LeaveStage.SUPERVISOR}
      backHref="/supervisor/izin"
      redirectTo="/supervisor/izin"
    />
  );
}
