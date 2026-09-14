import { NextResponse } from "next/server";
import { AttendanceApproval, Role } from "@/generated/prisma";
import { requireApiAnyRole } from "@/lib/api-auth";
import { OVERTIME_REVIEWER_STAGE } from "@/lib/overtime";
import { OvertimeService } from "@/servers/services/overtime.service";

/** Pengajuan lembur yang menunggu giliran reviewer yang login (admin/supervisor). */
export async function GET() {
  const auth = await requireApiAnyRole([Role.ADMIN, Role.SUPERVISOR]);

  if (!auth.user) return auth.response;

  const stage = OVERTIME_REVIEWER_STAGE[auth.user.role];
  const items = await OvertimeService.list({
    status: AttendanceApproval.PENDING,
    stage,
  });

  return NextResponse.json({ items });
}
