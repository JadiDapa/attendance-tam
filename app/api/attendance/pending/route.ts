import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiAnyRole } from "@/lib/api-auth";
import { ownerRolesForAttendanceReviewer } from "@/lib/attendance";
import { AttendanceService } from "@/servers/services/attendance.service";

/** Absensi luar radius yang menunggu giliran reviewer yang login (supervisor/manager). */
export async function GET() {
  const auth = await requireApiAnyRole([Role.SUPERVISOR, Role.MANAGER]);

  if (!auth.user) return auth.response;

  const items = await AttendanceService.listPendingApprovalForOwnerRoles(
    ownerRolesForAttendanceReviewer(auth.user.role),
  );

  return NextResponse.json({ items });
}
