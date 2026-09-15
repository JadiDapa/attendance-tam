import { notFound } from "next/navigation";
import FieldAssignmentDetailView from "@/components/field-assignment/FieldAssignmentDetailView";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { FieldAssignmentService } from "@/servers/services/field-assignment.service";

export default async function ManagerDinasLuarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.MANAGER);

  const { id } = await params;
  const assignment = await FieldAssignmentService.getById(id);

  if (!assignment) notFound();

  return (
    <FieldAssignmentDetailView
      assignment={assignment}
      canReview
      backHref="/manager/dinas-luar"
      redirectTo="/manager/dinas-luar"
    />
  );
}
