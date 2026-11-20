import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { confirmMissedCheckout } from "@/app/action/attendance.action";
import { AttendanceService } from "@/servers/services/attendance.service";
import { WorkDayService } from "@/servers/services/setting.service";
import { getWorkDate, toDateInputValue } from "@/lib/date";
import { describeMissedCheckout } from "@/lib/missed-checkout";

/**
 * Hari-hari yang absen masuknya ada tapi absen pulangnya belum dikonfirmasi.
 *
 * - `days` — "YYYY-MM-DD" saja. Dipertahankan apa adanya untuk mobile 1.1.0.
 * - `missedDays` — per hari: label hari + tanggal, jam masuk, dan jam pulang
 *   otomatis (Jam Pulang Hari Kerja itu), semuanya sudah diformat di server.
 */
export async function GET() {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const [unresolved, workDays] = await Promise.all([
    AttendanceService.listUnresolvedCheckouts(auth.user.id, getWorkDate()),
    WorkDayService.list(),
  ]);

  return NextResponse.json({
    days: unresolved.map((row) => toDateInputValue(row.workDate)),
    missedDays: unresolved.map((row) => describeMissedCheckout(row, workDays)),
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
