import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { createLeaveRequest } from "@/app/action/leave.action";
import { LeaveService } from "@/servers/services/leave.service";

/** Ajukan izin/sakit/cuti — multipart: type, startDate, endDate, reason, attachment?. */
export async function POST(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const formData = await request.formData();
  const result = await createLeaveRequest(formData);

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}

/** Riwayat pengajuan izin sendiri, terbaru dulu. */
export async function GET() {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const items = await LeaveService.list({ userId: auth.user.id });

  return NextResponse.json({ items });
}
