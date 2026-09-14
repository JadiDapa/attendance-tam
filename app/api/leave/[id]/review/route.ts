import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiAnyRole } from "@/lib/api-auth";
import { reviewLeaveRequest } from "@/app/action/leave.action";

/** Setujui/tolak pengajuan izin pada giliran reviewer yang login — JSON body: { status, reviewNote? }. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAnyRole([
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.MANAGER,
  ]);

  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const { id } = await params;
  const result = await reviewLeaveRequest(id, body);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
