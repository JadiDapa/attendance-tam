/**
 * Hari libur nasional / cuti bersama / libur internal.
 *
 * Melengkapi `lib/work-schedule.ts` yang hanya mengatur pola mingguan: hari
 * kerja biasa yang jatuh pada tanggal merah tetap dihitung libur.
 *
 * Sengaja bebas dari Prisma (hanya tipe struktural) supaya bisa dipakai form
 * client juga, sama seperti `work-schedule.ts`.
 */

export type HolidayTypeValue = "NASIONAL" | "CUTI_BERSAMA" | "INTERNAL";

/** `date` adalah tanggal kerja (kolom `date`, tengah malam UTC). */
export type HolidayConfig = {
  date: Date;
  name: string;
  type: HolidayTypeValue;
};

export const HOLIDAY_TYPE_OPTIONS: HolidayTypeValue[] = [
  "NASIONAL",
  "CUTI_BERSAMA",
  "INTERNAL",
];

export const HOLIDAY_TYPE_LABEL: Record<HolidayTypeValue, string> = {
  NASIONAL: "Libur Nasional",
  CUTI_BERSAMA: "Cuti Bersama",
  INTERNAL: "Libur Internal",
};

export const HOLIDAY_TYPE_VARIANT: Record<
  HolidayTypeValue,
  "default" | "secondary" | "destructive" | "outline"
> = {
  NASIONAL: "destructive",
  CUTI_BERSAMA: "secondary",
  INTERNAL: "outline",
};

/** Hari libur yang jatuh pada tanggal tertentu, atau null. */
export function findHoliday<T extends { date: Date }>(
  date: Date,
  holidays: T[],
): T | null {
  return (
    holidays.find((item) => item.date.getTime() === date.getTime()) ?? null
  );
}

/** Index tanggal → hari libur, supaya pencarian per tanggal tidak O(n). */
export function indexHolidays<T extends { date: Date }>(
  holidays: T[],
): Map<number, T> {
  return new Map(holidays.map((item) => [item.date.getTime(), item]));
}
