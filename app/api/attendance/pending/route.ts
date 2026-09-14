import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { AttendanceService } from "@/servers/services/attendance.service";

/** Absensi luar radius yang menunggu verifikasi admin. */
export async function GET() {
  const auth = await requireApiRole(Role.ADMIN);

  if (!auth.user) return auth.response;

  const items = await AttendanceService.listPendingApproval();

  return NextResponse.json({ items });
}
