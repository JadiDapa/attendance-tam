import { notFound } from "next/navigation";
import FieldAssignmentDetailView from "@/components/field-assignment/FieldAssignmentDetailView";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { FieldAssignmentService } from "@/servers/services/field-assignment.service";

export default async function AdminDinasLuarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.ADMIN);

  const { id } = await params;
  const assignment = await FieldAssignmentService.getById(id);

  if (!assignment) notFound();

  return (
    // Admin tidak lagi ikut approval dinas luar — selalu diajukan supervisor,
    // jadi giliran approvalnya selalu manager.
    <FieldAssignmentDetailView
      assignment={assignment}
      canReview={false}
      backHref="/admin/dinas-luar"
      redirectTo="/admin/dinas-luar"
    />
  );
}
