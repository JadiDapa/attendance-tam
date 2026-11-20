import { notFound } from "next/navigation";
import LeaveDetailView from "@/components/leave/LeaveDetailView";
import { LeaveStage, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { ApprovalRoutingService } from "@/servers/services/approval-routing.service";
import { LeaveService } from "@/servers/services/leave.service";

export default async function SupervisorIzinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const reviewer = await requireRole(Role.SUPERVISOR);

  const { id } = await params;
  const leave = await LeaveService.getById(id);

  if (!leave) notFound();

  const canView = await ApprovalRoutingService.canView(reviewer, leave.user);
  if (!canView) notFound();

  const canReview = await ApprovalRoutingService.canReviewLeave(reviewer, leave);

  return (
    <LeaveDetailView
      leave={leave}
      viewerStage={LeaveStage.SUPERVISOR}
      canReview={canReview}
      backHref="/supervisor/izin"
      redirectTo="/supervisor/izin"
    />
  );
}
