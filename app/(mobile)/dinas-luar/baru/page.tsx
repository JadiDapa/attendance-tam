import { FieldAssignmentForm } from "@/components/mobile/dinas-luar/field-assignment-form";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

// Mirrors `mobile/src/app/field-assignment-create.tsx` (thin wrapper around
// `FieldAssignmentForm`) — supervisor-only, calls `createFieldAssignment` directly.
export default async function DinasLuarBaruPage() {
  await requireRole(Role.SUPERVISOR);

  return <FieldAssignmentForm />;
}
