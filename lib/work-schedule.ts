/**
 * Hari kerja mingguan: label, urutan tampilan, dan pencarian jadwal per tanggal.
 *
 * Sengaja bebas dari Prisma (hanya tipe struktural) supaya bisa dipakai dari
 * server component maupun form client tanpa menarik Prisma client ke bundle.
 */

import { parseTimeToMinutes } from "./date";

/** `dayOfWeek` mengikuti `Date#getUTCDay()`: 0 = Minggu … 6 = Sabtu. */
export type WorkDayConfig = {
  dayOfWeek: number;
  isWorkingDay: boolean;
  /** "HH:mm" */
  checkInTime: string;
  /** "HH:mm" */
  checkOutTime: string;
  /** "HH:mm" — Jam Mulai Lembur, berdiri sendiri (tidak ikut Jam Pulang). */
  overtimeStartTime: string;
};

export const DAY_LABEL: Record<number, string> = {
  0: "Minggu",
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
};

export const DAY_SHORT_LABEL: Record<number, string> = {
  0: "Min",
  1: "Sen",
  2: "Sel",
  3: "Rab",
  4: "Kam",
  5: "Jum",
  6: "Sab",
};

/** Urutan tampilan: minggu kerja dimulai Senin, Minggu di paling akhir. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Dipakai kalau tabel `WorkDay` belum terisi — Senin–Jumat 08:00–17:00,
 * Lembur mulai 18:00.
 */
export const DEFAULT_WORK_DAYS: WorkDayConfig[] = WEEK_ORDER.map(
  (dayOfWeek) => ({
    dayOfWeek,
    isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
    checkInTime: "08:00",
    checkOutTime: "17:00",
    overtimeStartTime: "18:00",
  }),
);

/** Susun ulang ke urutan Senin→Minggu, lengkapi hari yang belum ada barisnya. */
export function orderWeek(days: WorkDayConfig[]): WorkDayConfig[] {
  return WEEK_ORDER.map(
    (dayOfWeek) =>
      days.find((day) => day.dayOfWeek === dayOfWeek) ??
      DEFAULT_WORK_DAYS.find((day) => day.dayOfWeek === dayOfWeek)!,
  );
}

/** Jadwal untuk satu tanggal. `date` adalah tanggal kerja (kolom `date` UTC). */
export function getWorkDayFor(
  date: Date,
  days: WorkDayConfig[],
): WorkDayConfig {
  const dayOfWeek = date.getUTCDay();

  return (
    days.find((day) => day.dayOfWeek === dayOfWeek) ??
    DEFAULT_WORK_DAYS.find((day) => day.dayOfWeek === dayOfWeek)!
  );
}

/** Hari libur menurut setting admin — pengganti asumsi Sabtu/Minggu. */
export function isNonWorkingDate(date: Date, days: WorkDayConfig[]): boolean {
  return !getWorkDayFor(date, days).isWorkingDay;
}

/**
 * Terlambat kalau jam absen masuk melewati jam masuk + toleransi. Satu-satunya
 * definisi "terlambat" di aplikasi — dipakai absen langsung, keputusan approval,
 * maupun pencatatan manual oleh admin.
 *
 * Terlambat hanya berlaku untuk `WorkMode.HADIR_DIKANTOR`; penyaringnya ada di
 * `resolveIsLate()` pada `attendance.action.ts`, bukan di sini.
 *
 * `minutesOfDay` adalah menit sejak tengah malam di APP_TIMEZONE.
 */
export function isLateAt(
  minutesOfDay: number,
  day: WorkDayConfig,
  toleranceMinutes: number,
): boolean {
  if (!day.isWorkingDay) return false;

  const start = parseTimeToMinutes(day.checkInTime);

  return start !== null && minutesOfDay > start + toleranceMinutes;
}

/**
 * Selisih menit dari jam masuk terjadwal, tanpa toleransi — dipakai untuk
 * `Attendance.lateMinutes` (rekap performa/bulanan), bukan untuk label
 * "terlambat" (lihat `isLateAt()`, yang tetap satu-satunya definisi itu).
 *
 * Contoh: jam masuk 08:00, toleransi 15 menit. Absen jam 08:10 → bukan
 * "terlambat" (10 < 15), tapi tetap dihitung 10 menit di sini. Absen jam
 * 08:20 → "terlambat" dan dihitung 20 menit di sini.
 */
export function lateMinutesAt(
  minutesOfDay: number,
  day: WorkDayConfig,
): number {
  if (!day.isWorkingDay) return 0;

  const start = parseTimeToMinutes(day.checkInTime);

  return start !== null ? Math.max(0, minutesOfDay - start) : 0;
}

/**
 * Absen masuk ditutup begitu lewat jam pulang terjadwal hari itu — dari titik
 * ini karyawan cuma bisa mengajukan lembur, bukan absen masuk biasa. Tidak
 * ada toleransi seperti `isLateAt()`, karena ini bukan soal terlambat.
 */
export function isCheckInClosed(
  minutesOfDay: number,
  day: WorkDayConfig,
): boolean {
  if (!day.isWorkingDay) return false;

  const end = parseTimeToMinutes(day.checkOutTime);

  return end !== null && minutesOfDay >= end;
}

/**
 * Lembur boleh dimulai pada `minutesOfDay` kalau sudah sampai Jam Mulai Lembur
 * Hari Kerja itu. Satu-satunya batas jam mulai Lembur untuk karyawan — koreksi
 * jam Lembur oleh admin sengaja tidak terikat aturan ini.
 *
 * Hanya butuh `overtimeStartTime`, jadi form client cukup mengirim jam itu.
 */
export function canStartOvertimeAt(
  minutesOfDay: number,
  day: Pick<WorkDayConfig, "overtimeStartTime">,
): boolean {
  const start = parseTimeToMinutes(day.overtimeStartTime);

  return start !== null && minutesOfDay >= start;
}

/**
 * Aturan menu Waktu Kerja: Jam Mulai Lembur tidak boleh lebih awal dari Jam
 * Pulang hari itu, supaya Lembur tidak tumpang tindih dengan kerja normal.
 * Hari libur tidak dicek — jamnya hanya disimpan untuk saat diaktifkan lagi
 * (sama seperti aturan jam masuk/pulang di validator).
 */
export function hasValidOvertimeStart(
  day: Pick<
    WorkDayConfig,
    "isWorkingDay" | "checkOutTime" | "overtimeStartTime"
  >,
): boolean {
  if (!day.isWorkingDay) return true;

  const checkOut = parseTimeToMinutes(day.checkOutTime);
  const overtimeStart = parseTimeToMinutes(day.overtimeStartTime);

  return (
    checkOut !== null && overtimeStart !== null && overtimeStart >= checkOut
  );
}

/**
 * Jam pulang yang dicatat saat karyawan menekan "Otomatis" untuk Absen Pulang
 * Terlewat: Jam Pulang Hari Kerja tanggal yang dikonfirmasi (Sabtu 14:00, hari
 * biasa 17:00), bukan jam tetap. Hari libur tetap memakai Jam Pulang yang
 * tersimpan untuk hari itu.
 */
export function autoCheckOutTimeFor(date: Date, days: WorkDayConfig[]): string {
  return getWorkDayFor(date, days).checkOutTime;
}

/**
 * Validasi Absen Pulang Terlewat: jam pulang ("HH:mm") harus sesudah jam absen
 * masuk ("HH:mm") tanggal itu — mencegah data seperti pulang 05:00 untuk masuk
 * 08:00, yang terjadi saat karyawan mengira yang diminta adalah jam saat ini.
 * Mengembalikan pesan error (menyebut jam masuk) atau null kalau sah. Dipakai
 * server (penentu) maupun dialog client, supaya pesannya sama.
 */
export function missedCheckoutTimeError(
  checkOutTime: string,
  checkInTime: string,
): string | null {
  const checkOut = parseTimeToMinutes(checkOutTime);
  const checkIn = parseTimeToMinutes(checkInTime);

  if (checkOut === null) return "Format jam harus HH:mm";
  if (checkIn !== null && checkOut <= checkIn) {
    return `Jam pulang harus setelah jam masuk ${checkInTime}`;
  }

  return null;
}

/** "08:00 – 17:00" atau "Libur". */
export function formatDayHours(day: WorkDayConfig): string {
  return day.isWorkingDay
    ? `${day.checkInTime} – ${day.checkOutTime}`
    : "Libur";
}

/** Lama kerja satu hari dalam menit; 0 untuk hari libur. */
export function dayDurationMinutes(day: WorkDayConfig): number {
  if (!day.isWorkingDay) return 0;

  const start = parseTimeToMinutes(day.checkInTime);
  const end = parseTimeToMinutes(day.checkOutTime);

  if (start === null || end === null) return 0;

  return Math.max(0, end - start);
}

export type WeekSummary = {
  workingDays: number;
  totalMinutes: number;
  /** "40j 30m" */
  totalLabel: string;
  /** Ringkasan pendek, mis. "Senin–Jumat 08:00–17:00 · Sabtu 08:00–14:00". */
  scheduleLabel: string;
};

/**
 * Ringkasan seminggu. Hari berurutan dengan jam yang sama digabung jadi satu
 * rentang ("Senin–Jumat") supaya ringkasannya tetap pendek.
 */
export function summarizeWeek(days: WorkDayConfig[]): WeekSummary {
  const ordered = orderWeek(days);
  const working = ordered.filter((day) => day.isWorkingDay);
  const totalMinutes = ordered.reduce(
    (sum, day) => sum + dayDurationMinutes(day),
    0,
  );

  const groups: { from: number; to: number; hours: string }[] = [];

  for (const day of working) {
    const hours = formatDayHours(day);
    const last = groups.at(-1);
    const isNext =
      last &&
      last.hours === hours &&
      WEEK_ORDER.indexOf(day.dayOfWeek) === WEEK_ORDER.indexOf(last.to) + 1;

    if (isNext) last.to = day.dayOfWeek;
    else groups.push({ from: day.dayOfWeek, to: day.dayOfWeek, hours });
  }

  const scheduleLabel = groups.length
    ? groups
        .map((group) => {
          const range =
            group.from === group.to
              ? DAY_LABEL[group.from]
              : `${DAY_LABEL[group.from]}–${DAY_LABEL[group.to]}`;

          return `${range} ${group.hours}`;
        })
        .join(" · ")
    : "Belum ada hari kerja";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    workingDays: working.length,
    totalMinutes,
    totalLabel: minutes ? `${hours}j ${minutes}m` : `${hours}j`,
    scheduleLabel,
  };
}
