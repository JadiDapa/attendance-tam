import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiAnyRole } from "@/lib/api-auth";
import { ApprovalRoutingService } from "@/servers/services/approval-routing.service";
import { LeaveService } from "@/servers/services/leave.service";

/** Pengajuan izin/sakit/cuti yang menunggu giliran reviewer yang login (supervisor/manager) sesuai cakupan Divisi. */
export async function GET() {
  const auth = await requireApiAnyRole([Role.SUPERVISOR, Role.MANAGER]);

  if (!auth.user) return auth.response;

  const scope = await ApprovalRoutingService.getScopeForReviewer(auth.user);
  const items = await LeaveService.listPendingForScope(scope);

  return NextResponse.json({ items });
}
