import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiAnyRole } from "@/lib/api-auth";
import { UserService } from "@/servers/services/user.service";
import { EmploymentDataService } from "@/servers/services/employee-profile.service";

const ROLE_VALUES = new Set<string>(Object.values(Role));

/** Daftar seluruh pengguna (semua role, aktif maupun tidak) — dipakai halaman admin. */
export async function GET(req: Request) {
  const auth = await requireApiAnyRole([Role.ADMIN, Role.SUPERVISOR, Role.MANAGER]);

  if (!auth.user) return auth.response;

  const url = new URL(req.url);
  const roleParam = url.searchParams.get("role");
  const role = roleParam && ROLE_VALUES.has(roleParam) ? (roleParam as Role) : undefined;

  const users = await UserService.list({ role });
  const employmentData = await EmploymentDataService.listByUserIds(
    users.map((user) => user.id),
  );
  const employmentByUser = new Map(
    employmentData.map((item) => [item.userId, item]),
  );

  return NextResponse.json({
    items: users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      isActive: user.isActive,
      nip: employmentByUser.get(user.id)?.employeeNumber ?? null,
      startDate: employmentByUser.get(user.id)?.startDate.toISOString() ?? null,
    })),
  });
}
