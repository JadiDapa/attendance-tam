import { notFound } from "next/navigation";
import OvertimeDetailView from "@/components/overtime/OvertimeDetailView";
import { OvertimeStage, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { ApprovalRoutingService } from "@/servers/services/approval-routing.service";
import { OvertimeService } from "@/servers/services/overtime.service";

export default async function SupervisorLemburDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const reviewer = await requireRole(Role.SUPERVISOR);

  const { id } = await params;
  const overtime = await OvertimeService.getById(id);

  if (!overtime) notFound();

  const canView = await ApprovalRoutingService.canView(reviewer, overtime.user);
  if (!canView) notFound();

  const canReview = await ApprovalRoutingService.canReviewOvertime(reviewer, overtime);

  return (
    <OvertimeDetailView
      overtime={overtime}
      viewerStage={OvertimeStage.SUPERVISOR}
      canReview={canReview}
      backHref="/supervisor/lembur"
      redirectTo="/supervisor/lembur"
    />
  );
}
