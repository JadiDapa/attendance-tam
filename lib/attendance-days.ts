/**
 * Perakit data absensi harian untuk halaman karyawan.
 *
 * Dashboard dan Riwayat memakai rentang tanggal, kartu statistik, kalender, dan
 * tabel yang sama — semuanya dihitung dari satu daftar hari di sini supaya
 * angka di kartu, kalender, dan tabel tidak pernah berbeda.
 *
 * Dipakai dari server component saja (semua tanggal & angka diformat di sini).
 */

import {
  eachDate,
  formatDuration,
  formatMonth,
  formatWorkDate,
  getMonthRange,
  parseTimeToMinutes,
  formatMinutesAsTime,
  toDateInputValue,
} from "./date";
import {
  getWeekdayIndex,
  toRecapEntry,
  type AttendanceDay,
  type AttendanceMonth,
  type AttendanceSummary,
  type CalendarStatus,
} from "./attendance";
import { LEAVE_TYPE_LABEL } from "./leave";
import { APPROVAL_LABEL } from "./work-mode";
import { resolveReportQuery } from "@/servers/validators/report.validator";
import type { ReportRow } from "@/servers/services/report.service";

export type AttendanceRange = {
  startDate: Date;
  endDate: Date;
  /** Pesan kalau rentang di URL tidak valid — rentang jatuh ke bulan berjalan. */
  error: string | null;
};

/** Rentang dari URL; default satu bulan penuh supaya kalender tidak terpotong. */
export function resolveAttendanceRange(
  params: { start?: string; end?: string },
  today: Date,
): AttendanceRange {
  const fallback = getMonthRange(today);
  const resolved = resolveReportQuery({
    start: params.start || toDateInputValue(fallback.startDate),
    end: params.end || toDateInputValue(fallback.endDate),
  });

  return resolved.ok
    ? {
        startDate: resolved.value.startDate,
        endDate: resolved.value.endDate,
        error: null,
      }
    : { ...fallback, error: resolved.error };
}

/**
 * Rekap satu karyawan → satu baris per tanggal dalam rentang.
 *
 * Status libur (pola mingguan maupun tanggal merah) sudah ditentukan di
 * `ReportService.buildRecap`, jadi di sini tinggal dipakai apa adanya.
 */
export function buildAttendanceDays(options: {
  rows: ReportRow[];
  startDate: Date;
  endDate: Date;
  today: Date;
}): AttendanceDay[] {
  const { rows, startDate, endDate, today } = options;
  const rowByDate = new Map(rows.map((row) => [row.workDate.getTime(), row]));

  return eachDate(startDate, endDate).map((date) => {
    const row = rowByDate.get(date.getTime()) ?? null;
    const isToday = date.getTime() === today.getTime();
    const isPast = date.getTime() < today.getTime();

    // Hari ini masih berjalan, jadi belum dihitung Alfa.
    const status: CalendarStatus =
      !row || (row.status === "ALFA" && !isPast) ? "KOSONG" : row.status;

    // Absensi yang menunggu keputusan admin diberi keterangan itu lebih dulu —
    // penjelasan karyawan sendiri jadi cadangan kalau sudah diputuskan.
    const statusDetail = row?.pendingApproval
      ? APPROVAL_LABEL.PENDING
      : (row?.checkIn?.workModeDetail ??
        (row?.leaveType
          ? LEAVE_TYPE_LABEL[row.leaveType]
          : (row?.holidayName ?? null)));

    return {
      key: toDateInputValue(date),
      dayOfMonth: date.getUTCDate(),
      weekdayIndex: getWeekdayIndex(date),
      dateLabel: formatWorkDate(date),
      status,
      statusDetail,
      checkIn: row?.checkIn ? toRecapEntry("Absen Masuk", row.checkIn) : null,
      checkOut: row?.checkOut
        ? toRecapEntry("Absen Pulang", row.checkOut)
        : null,
      durationLabel:
        row?.checkIn && row.checkOut
          ? formatDuration(row.checkIn.timestamp, row.checkOut.timestamp)
          : null,
      missingCheckOut: row?.missingCheckOut ?? false,
      pendingApproval: row?.pendingApproval ?? false,
      isToday,
      isPast,
    };
  });
}

/** Kelompokkan hari per bulan — kalender menggambar satu grid tiap bulan. */
export function groupDaysByMonth(days: AttendanceDay[]): AttendanceMonth[] {
  const months: AttendanceMonth[] = [];

  for (const day of days) {
    const key = day.key.slice(0, 7);
    const last = months.at(-1);

    if (last?.key === key) last.days.push(day);
    else {
      months.push({
        key,
        label: formatMonth(new Date(`${key}-01T00:00:00.000Z`)),
        days: [day],
      });
    }
  }

  return months;
}

export function summarizeDays(days: AttendanceDay[]): AttendanceSummary {
  const count = (status: CalendarStatus) =>
    days.filter((day) => day.status === status).length;

  const hadirDikantor = count("HADIR_DIKANTOR");
  const wfh = count("WFH");
  const dinasLuar = count("DINAS_LUAR");

  // `isWithinRadius === null` berarti absensi yang dicatat admin manual — tidak
  // ada koordinat yang terekam, jadi tidak dihitung sebagai di luar radius.
  const outsideRadius = days.filter((day) =>
    [day.checkIn, day.checkOut].some((entry) => entry?.isWithinRadius === false),
  ).length;

  const checkInMinutes = days
    .map((day) => day.checkIn && parseTimeToMinutes(day.checkIn.time))
    .filter((minutes): minutes is number => minutes !== null);

  return {
    hadirDikantor,
    wfh,
    dinasLuar,
    sakit: count("SAKIT"),
    izin: count("IZIN"),
    alfa: count("ALFA"),
    cuti: count("CUTI"),
    libur: count("LIBUR"),
    // Terlambat adalah atribut, bukan status — dihitung dari absen masuknya
    // sendiri, dan sudah ikut terhitung di `hadirDikantor`.
    terlambat: days.filter(
      (day) => day.status === "HADIR_DIKANTOR" && day.checkIn?.isLate,
    ).length,
    pendingApproval: days.filter((day) => day.pendingApproval).length,
    outsideRadius,
    missingCheckOut: days.filter((day) => day.missingCheckOut).length,
    totalHadir: hadirDikantor + wfh + dinasLuar,
    averageCheckIn: checkInMinutes.length
      ? formatMinutesAsTime(
          Math.round(
            checkInMinutes.reduce((sum, value) => sum + value, 0) /
              checkInMinutes.length,
          ),
        )
      : null,
  };
}
