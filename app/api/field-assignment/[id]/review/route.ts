import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { reviewFieldAssignment } from "@/app/action/field-assignment.action";

/** Setujui/tolak penugasan dinas luar — manager saja, JSON body: { status, reviewNote? }. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiRole(Role.MANAGER);

  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const { id } = await params;
  const result = await reviewFieldAssignment(id, body);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
