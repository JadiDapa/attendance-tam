import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiAnyRole } from "@/lib/api-auth";
import { LEAVE_REVIEWER_STAGE } from "@/lib/leave";
import { LeaveService } from "@/servers/services/leave.service";
import { LeaveStatus } from "@/generated/prisma";

/** Pengajuan izin/sakit/cuti yang menunggu giliran reviewer yang login (supervisor/manager). */
export async function GET() {
  const auth = await requireApiAnyRole([Role.SUPERVISOR, Role.MANAGER]);

  if (!auth.user) return auth.response;

  const stage = LEAVE_REVIEWER_STAGE[auth.user.role];
  const items = await LeaveService.list({ status: LeaveStatus.PENDING, stage });

  return NextResponse.json({ items });
}
