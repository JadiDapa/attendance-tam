import { notFound } from "next/navigation";
import FieldAssignmentDetailView from "@/components/field-assignment/FieldAssignmentDetailView";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { FieldAssignmentService } from "@/servers/services/field-assignment.service";

/** Supervisor cuma pembuat penugasan, bukan reviewer — halaman ini view-only. */
export default async function SupervisorDinasLuarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.SUPERVISOR);

  const { id } = await params;
  const assignment = await FieldAssignmentService.getById(id);

  if (!assignment) notFound();

  return (
    <FieldAssignmentDetailView
      assignment={assignment}
      canReview={false}
      backHref="/supervisor/dinas-luar"
      redirectTo="/supervisor/dinas-luar"
    />
  );
}
