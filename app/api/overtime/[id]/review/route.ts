import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiAnyRole } from "@/lib/api-auth";
import { reviewOvertime } from "@/app/action/overtime.action";

/** Setujui/tolak pengajuan lembur pada giliran reviewer yang login — JSON body: { status, reviewNote? }. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAnyRole([Role.ADMIN, Role.SUPERVISOR]);

  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const { id } = await params;
  const result = await reviewOvertime(id, body);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
