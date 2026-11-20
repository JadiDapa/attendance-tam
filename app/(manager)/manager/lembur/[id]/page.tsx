import { notFound } from "next/navigation";
import OvertimeDetailView from "@/components/overtime/OvertimeDetailView";
import { OvertimeStage, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { ApprovalRoutingService } from "@/servers/services/approval-routing.service";
import { OvertimeService } from "@/servers/services/overtime.service";

export default async function ManagerLemburDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const reviewer = await requireRole(Role.MANAGER);

  const { id } = await params;
  const overtime = await OvertimeService.getById(id);

  if (!overtime) notFound();

  const canReview = await ApprovalRoutingService.canReviewOvertime(reviewer, overtime);

  return (
    <OvertimeDetailView
      overtime={overtime}
      viewerStage={OvertimeStage.MANAGER}
      canReview={canReview}
      backHref="/manager/lembur"
      redirectTo="/manager/lembur"
    />
  );
}
