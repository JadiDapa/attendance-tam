import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { requireApiAnyRole } from "@/lib/api-auth";
import { resolveAdminRecapQuery } from "@/servers/validators/admin-recap.validator";
import { ReportService } from "@/servers/services/report.service";
import { MonthlyReportService } from "@/servers/services/monthly-report.service";
import { UserService } from "@/servers/services/user.service";
import { OvertimeService } from "@/servers/services/overtime.service";
import type { Attendance, Overtime } from "@/generated/prisma";

/** Satu absensi untuk sheet koreksi admin di mobile — jam sebagai ISO string. */
function toEntry(attendance: Attendance | null) {
  if (!attendance) return null;

  return {
    id: attendance.id,
    timestamp: attendance.timestamp.toISOString(),
    addedByAdmin: attendance.createdByAdminId !== null,
    editedByAdmin: attendance.editedById !== null,
    originalTimestamp: attendance.originalTimestamp?.toISOString() ?? null,
  };
}

function toOvertimeEntry(overtime: Overtime) {
  return {
    id: overtime.id,
    startAt: overtime.startAt.toISOString(),
    endAt: overtime.endAt?.toISOString() ?? null,
    status: overtime.status,
    editedByAdmin: overtime.editedById !== null,
  };
}

const NOT_ATTEND_STATUSES = new Set(["ALFA", "IZIN", "SAKIT", "CUTI"]);
const ATTEND_STATUSES = new Set(["HADIR_DIKANTOR", "LUAR_RADIUS", "DINAS_LUAR"]);

/** Not attend > attend (diurutkan makin telat makin atas) > libur. Satu kunci angka, bukan grup terpisah. */
function sortKey(status: string, lateMinutes: number) {
  if (NOT_ATTEND_STATUSES.has(status)) return 2_000_000 + lateMinutes;
  if (ATTEND_STATUSES.has(status)) return 1_000_000 + lateMinutes;

  return lateMinutes;
}

/**
 * Rekap absensi admin — mode harian (satu hari, semua karyawan, diurutkan
 * tidak hadir -> paling telat -> paling awal) atau bulanan (agregat sebulan
 * per karyawan). Beda dari `/api/rekapan-kehadiran` yang selalu balas file
 * xlsx untuk export, bukan JSON untuk tampilan di dalam aplikasi.
 */
export async function GET(req: Request) {
  const auth = await requireApiAnyRole([Role.ADMIN, Role.SUPERVISOR, Role.MANAGER]);

  if (!auth.user) return auth.response;

  const url = new URL(req.url);
  const resolved = resolveAdminRecapQuery(Object.fromEntries(url.searchParams));

  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  if (resolved.value.mode === "daily") {
    const { date } = resolved.value;

    const [rows, employees, overtimes] = await Promise.all([
      ReportService.buildRecap({ startDate: date, endDate: date }),
      UserService.list({ role: Role.EMPLOYEE, isActive: true }),
      OvertimeService.listByWorkDate(date),
    ]);
    const avatarByUser = new Map(
      employees.map((employee) => [employee.id, employee.profileImageUrl]),
    );

    const items = rows
      .map((row) => ({
        userId: row.user.id,
        name: row.user.name,
        profileImageUrl: avatarByUser.get(row.user.id) ?? null,
        status: row.status,
        isLate: row.checkIn?.isLate ?? false,
        lateMinutes: row.checkIn?.lateMinutes ?? 0,
        checkInTime: row.checkIn ? row.checkIn.timestamp.toISOString() : null,
        checkOutTime: row.checkOut ? row.checkOut.timestamp.toISOString() : null,
        // Detail per baris supaya admin bisa mengoreksi jam / menambah yang
        // hilang dari layar yang sama (hanya ADMIN yang boleh, dicek server).
        checkIn: toEntry(row.checkIn),
        checkOut: toEntry(row.checkOut),
        overtimes: overtimes
          .filter((overtime) => overtime.userId === row.user.id)
          .map(toOvertimeEntry),
      }))
      .sort((a, b) => sortKey(b.status, b.lateMinutes) - sortKey(a.status, a.lateMinutes));

    return NextResponse.json({ mode: "daily", items });
  }

  const { startDate, endDate } = resolved.value;
  const rows = await MonthlyReportService.buildAttendanceRecap({ startDate, endDate });

  const items = rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    profileImageUrl: row.profileImageUrl,
    nip: row.nip,
    // Dinas luar ikut dihitung hadir — sudah pasti dijalankan, bukan absen.
    totalAttend: row.hadir + row.dinasLuar,
    lateCount: row.telat,
    // Setiap penyebab tidak hadir ditotal jadi satu angka.
    totalNotAttend: row.sakit + row.izin + row.cuti + row.alfa,
    totalLemburMinutes: row.lemburHarianMinutes + row.lemburLiburMinutes,
  }));

  return NextResponse.json({ mode: "monthly", items });
}
