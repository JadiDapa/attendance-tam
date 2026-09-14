import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { cancelFieldAssignment } from "@/app/action/field-assignment.action";

/** Batalkan pengajuan sendiri, selama belum diputuskan manager. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiRole(Role.SUPERVISOR);

  if (!auth.user) return auth.response;

  const { id } = await params;
  const result = await cancelFieldAssignment(id);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
