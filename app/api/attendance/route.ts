import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { submitAttendance } from "@/app/action/attendance.action";
import { AttendanceService } from "@/servers/services/attendance.service";
import { fromDateInputValue, getMonthRange, getWorkDate } from "@/lib/date";

/**
 * Absen masuk/pulang dari mobile — payload sama persis dengan form web
 * (multipart: type, latitude, longitude, accuracy, photo, dan workMode +
 * workModeDetail kalau di luar radius). Semua validasi & business logic
 * (verifikasi wajah, radius, keterlambatan) tetap di `submitAttendance()`.
 */
export async function POST(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const formData = await request.formData();
  const result = await submitAttendance(formData);

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}

/**
 * Riwayat absensi sendiri, dikelompokkan per hari kerja. Query `from`/`to`
 * ("YYYY-MM-DD") opsional — default bulan berjalan kalau tidak diisi.
 */
export async function GET(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (fromParam && !fromDateInputValue(fromParam)) {
    return NextResponse.json(
      { error: "Parameter 'from' tidak valid, format: YYYY-MM-DD" },
      { status: 400 },
    );
  }

  if (toParam && !fromDateInputValue(toParam)) {
    return NextResponse.json(
      { error: "Parameter 'to' tidak valid, format: YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const startDate = fromParam ? fromDateInputValue(fromParam) : null;
  const endDate = toParam ? fromDateInputValue(toParam) : null;
  const range =
    startDate && endDate ? { startDate, endDate } : getMonthRange(getWorkDate());

  const days = await AttendanceService.listGroupedByDate(auth.user.id, range);

  return NextResponse.json({ days });
}
