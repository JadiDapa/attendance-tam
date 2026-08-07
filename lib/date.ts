/**
 * Semua penentuan "hari kerja" dan keterlambatan memakai satu timezone
 * (default Asia/Jakarta) supaya tidak bergantung pada zona waktu server.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Jakarta";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// en-GB dipakai supaya pemisahnya ":" (id-ID memakai "." → "11.10").
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateLabelFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

const weekdayFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  weekday: "short",
});

const monthFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getZonedParts(date: Date): ZonedParts {
  const parts: Record<string, number> = {};

  for (const part of partsFormatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }

  return parts as ZonedParts;
}

/**
 * Tanggal kerja untuk sebuah timestamp: tengah malam UTC dari tanggal kalender
 * di APP_TIMEZONE. Cocok dengan kolom Prisma bertipe `@db.Date`.
 */
export function getWorkDate(date: Date = new Date()): Date {
  const { year, month, day } = getZonedParts(date);

  return new Date(Date.UTC(year, month - 1, day));
}

/** Menit sejak tengah malam di APP_TIMEZONE, mis. 08:30 → 510. */
export function getMinutesOfDay(date: Date = new Date()): number {
  const { hour, minute } = getZonedParts(date);

  return hour * 60 + minute;
}

/** "08:30" → 510. Mengembalikan null kalau format tidak valid. */
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());

  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour > 23 || minute > 59) return null;

  return hour * 60 + minute;
}

/** 510 → "08:30" */
export function formatMinutesAsTime(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Kebalikan `getWorkDate` + `getMinutesOfDay`: tanggal kerja + jam dinding di
 * APP_TIMEZONE → timestamp UTC. Dipakai koreksi absensi, yang menyimpan jam
 * sebagai teks "HH:mm" lalu perlu membentuk `Attendance.timestamp`.
 *
 * Offset zona dihitung ulang dari tanggalnya sendiri, jadi tetap benar untuk
 * zona ber-DST (kecuali pada jam yang ambigu saat pergantian DST — tidak
 * relevan untuk Asia/Jakarta yang offset-nya tetap).
 */
export function workDateTimeToUtc(workDate: Date, time: string): Date | null {
  const minutes = parseTimeToMinutes(time);

  if (minutes === null) return null;

  const guess = new Date(workDate.getTime() + minutes * 60_000);
  const parts = getZonedParts(guess);
  const asZoned = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );

  return new Date(guess.getTime() - (asZoned - guess.getTime()));
}

/** Jam pada timestamp absensi, mis. "08:03". */
export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

/** Label tanggal kerja, mis. "Jum, 31 Jul 2026". Input harus kolom `date`. */
export function formatWorkDate(date: Date): string {
  return dateLabelFormatter.format(date);
}

/** Label ringkas untuk sumbu grafik, mis. "31 Jul". Input harus kolom `date`. */
export function formatShortDate(date: Date): string {
  return shortDateFormatter.format(date);
}

/** Nama hari singkat, mis. "Jum". Input harus kolom `date`. */
export function formatWeekday(date: Date): string {
  return weekdayFormatter.format(date);
}

/** Label bulan, mis. "Agustus 2026". Input harus kolom `date`. */
export function formatMonth(date: Date): string {
  return monthFormatter.format(date);
}

/** Tanggal pertama & terakhir dari bulan sebuah tanggal kerja. */
export function getMonthRange(date: Date): { startDate: Date; endDate: Date } {
  return {
    startDate: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
    endDate: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)),
  };
}

/** Geser tanggal kerja beberapa hari, tetap tengah malam UTC. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Semua tanggal kerja dari start sampai end, inklusif. */
export function eachDate(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];

  for (
    let time = startDate.getTime();
    time <= endDate.getTime();
    time += MS_PER_DAY
  ) {
    dates.push(new Date(time));
  }

  return dates;
}

/** Selisih dua waktu jadi label durasi, mis. "8j 15m". */
export function formatDuration(from: Date, to: Date): string | null {
  const minutes = Math.round((to.getTime() - from.getTime()) / 60000);

  if (minutes < 0) return null;

  const hours = Math.floor(minutes / 60);

  return hours > 0 ? `${hours}j ${minutes % 60}m` : `${minutes}m`;
}

/** "2026-07-31" (dipakai untuk value input type="date"). */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2026-07-31" → Date tengah malam UTC. Null kalau tidak valid. */
export function fromDateInputValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}
