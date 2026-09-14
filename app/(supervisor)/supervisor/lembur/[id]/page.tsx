import { notFound } from "next/navigation";
import OvertimeDetailView from "@/components/overtime/OvertimeDetailView";
import { OvertimeStage, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { OvertimeService } from "@/servers/services/overtime.service";

export default async function SupervisorLemburDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.SUPERVISOR);

  const { id } = await params;
  const overtime = await OvertimeService.getById(id);

  if (!overtime) notFound();

  return (
    <OvertimeDetailView
      overtime={overtime}
      viewerStage={OvertimeStage.SUPERVISOR}
      backHref="/supervisor/lembur"
      redirectTo="/supervisor/lembur"
    />
  );
}
