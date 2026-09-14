import { NextResponse } from "next/server";
import { AttendanceApproval, Role } from "@/generated/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { FieldAssignmentService } from "@/servers/services/field-assignment.service";

/** Penugasan dinas luar yang menunggu keputusan admin. */
export async function GET() {
  const auth = await requireApiRole(Role.ADMIN);

  if (!auth.user) return auth.response;

  const items = await FieldAssignmentService.list({
    status: AttendanceApproval.PENDING,
  });

  return NextResponse.json({ items });
}
