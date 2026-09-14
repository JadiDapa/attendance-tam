import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { UserService } from "@/servers/services/user.service";

/** Daftar karyawan aktif — dipakai pemilihan karyawan saat supervisor membuat penugasan dinas luar. */
export async function GET() {
  const auth = await requireApiRole(Role.SUPERVISOR);

  if (!auth.user) return auth.response;

  const employees = await UserService.list({
    role: Role.EMPLOYEE,
    isActive: true,
  });

  return NextResponse.json({
    items: employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      position: employee.position,
    })),
  });
}
