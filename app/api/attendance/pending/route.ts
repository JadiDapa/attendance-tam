import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiAnyRole } from "@/lib/api-auth";
import { ApprovalRoutingService } from "@/servers/services/approval-routing.service";
import { AttendanceService } from "@/servers/services/attendance.service";

/** Absensi luar radius yang menunggu giliran reviewer yang login (supervisor/manager) sesuai cakupan Divisi. */
export async function GET() {
  const auth = await requireApiAnyRole([Role.SUPERVISOR, Role.MANAGER]);

  if (!auth.user) return auth.response;

  const scope = await ApprovalRoutingService.getScopeForReviewer(auth.user);
  const items = await AttendanceService.listPendingApprovalForScope(scope);

  return NextResponse.json({ items });
}
