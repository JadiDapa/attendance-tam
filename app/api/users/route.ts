import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { FieldAssignmentService } from "@/servers/services/field-assignment.service";

/**
 * Daftar karyawan yang boleh dipilih Supervisor saat membuat Dinas luar:
 * karyawan aktif di Divisinya (semua kalau Supervisor belum punya Jabatan).
 * Bentuk respons tetap, jadi mobile 1.1.0 tidak perlu berubah.
 */
export async function GET() {
  const auth = await requireApiRole(Role.SUPERVISOR);

  if (!auth.user) return auth.response;

  const employees = await FieldAssignmentService.listAssignableEmployees(
    auth.user,
  );

  return NextResponse.json({
    items: employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      position: employee.position,
    })),
  });
}
