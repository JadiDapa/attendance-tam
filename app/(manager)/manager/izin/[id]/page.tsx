import { notFound } from "next/navigation";
import LeaveDetailView from "@/components/leave/LeaveDetailView";
import { LeaveStage, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { ApprovalRoutingService } from "@/servers/services/approval-routing.service";
import { LeaveService } from "@/servers/services/leave.service";

export default async function ManagerIzinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const reviewer = await requireRole(Role.MANAGER);

  const { id } = await params;
  const leave = await LeaveService.getById(id);

  if (!leave) notFound();

  const canReview = await ApprovalRoutingService.canReviewLeave(reviewer, leave);

  return (
    <LeaveDetailView
      leave={leave}
      viewerStage={LeaveStage.MANAGER}
      canReview={canReview}
      backHref="/manager/izin"
      redirectTo="/manager/izin"
    />
  );
}
