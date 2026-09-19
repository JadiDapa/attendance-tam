import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { updateOvertimeTime } from "@/app/action/overtime.action";

/**
 * Admin mengoreksi jam lembur — JSON body: { startTime: "HH:mm",
 * endTime?: "HH:mm", editNote }. `endTime` kosong = jam selesai tidak diubah.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiRole(Role.ADMIN);

  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const { id } = await params;
  const result = await updateOvertimeTime(id, body);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
