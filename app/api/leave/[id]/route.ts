import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { cancelLeaveRequest } from "@/app/action/leave.action";

/** Batalkan pengajuan sendiri, selama belum diputuskan admin. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const { id } = await params;
  const result = await cancelLeaveRequest(id);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
