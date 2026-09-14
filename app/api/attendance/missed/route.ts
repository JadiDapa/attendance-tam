import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { confirmMissedCheckout } from "@/app/action/attendance.action";
import { AttendanceService } from "@/servers/services/attendance.service";
import { getWorkDate, toDateInputValue } from "@/lib/date";

/** Hari-hari yang absen masuknya ada tapi absen pulangnya belum dikonfirmasi. */
export async function GET() {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const unresolved = await AttendanceService.listUnresolvedCheckouts(
    auth.user.id,
    getWorkDate(),
  );

  return NextResponse.json({
    days: unresolved.map((row) => toDateInputValue(row.workDate)),
  });
}

/** Konfirmasi absen pulang yang terlewat — JSON body: { workDate, time? }. */
export async function POST(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const result = await confirmMissedCheckout(body);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
