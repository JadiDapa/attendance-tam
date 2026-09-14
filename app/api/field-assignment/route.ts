import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiRole, requireApiUser } from "@/lib/api-auth";
import { createFieldAssignment } from "@/app/action/field-assignment.action";
import { FieldAssignmentService } from "@/servers/services/field-assignment.service";

/** Buat penugasan dinas luar — supervisor saja, multipart: employeeIds[], startDate, endDate, reason, attachment. */
export async function POST(request: Request) {
  const auth = await requireApiRole(Role.SUPERVISOR);

  if (!auth.user) return auth.response;

  const formData = await request.formData();
  const result = await createFieldAssignment(formData);

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}

/**
 * Daftar dinas luar untuk user yang login. Supervisor melihat yang dia buat
 * sendiri; karyawan (dan role lain) melihat yang menugaskan mereka —
 * baca-saja, tidak ada aksi approve/reject dari mobile (itu wewenang manager
 * di web dashboard).
 */
export async function GET() {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const items = await FieldAssignmentService.list(
    auth.user.role === Role.SUPERVISOR
      ? { createdById: auth.user.id }
      : { employeeId: auth.user.id },
  );

  return NextResponse.json({ items });
}
