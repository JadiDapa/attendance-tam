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

/** Dipakai kalau tabel `WorkDay` belum terisi — Senin–Jumat 08:00–17:00. */
export const DEFAULT_WORK_DAYS: WorkDayConfig[] = WEEK_ORDER.map(
  (dayOfWeek) => ({
    dayOfWeek,
    isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
    checkInTime: "08:00",
    checkOutTime: "17:00",
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
