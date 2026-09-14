import { notFound } from "next/navigation";
import LeaveDetailView from "@/components/leave/LeaveDetailView";
import { LeaveStage, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { LeaveService } from "@/servers/services/leave.service";

export default async function AdminIzinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.ADMIN);

  const { id } = await params;
  const leave = await LeaveService.getById(id);

  if (!leave) notFound();

  return (
    <LeaveDetailView
      leave={leave}
      viewerStage={LeaveStage.ADMIN}
      backHref="/admin/izin"
      redirectTo="/admin/izin"
    />
  );
}
