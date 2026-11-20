/**
 * Data tampilan untuk dialog/modal Absen Pulang Terlewat. Aturannya sendiri
 * (jam otomatis, validasi) ada di `work-schedule.ts`; modul ini hanya
 * merangkai dan memformatnya di server.
 *
 * Bebas Prisma seperti modul aturan lain, jadi tipe `MissedCheckoutDay` bisa
 * diimpor komponen client.
 */

import { formatDayShortDate, formatTime, toDateInputValue } from "./date";
import { autoCheckOutTimeFor, type WorkDayConfig } from "./work-schedule";

/**
 * Satu Absen Pulang Terlewat, siap tampil — semua tanggal/jam sudah diformat
 * di server supaya tidak bergeser mengikuti timezone perangkat karyawan.
 */
export type MissedCheckoutDay = {
  /** "YYYY-MM-DD" — dikirim balik saat konfirmasi. */
  workDate: string;
  /** "Sabtu, 14 Nov" */
  dayLabel: string;
  /** "HH:mm" — jam absen masuk hari itu. */
  checkInTime: string;
  /** "HH:mm" — Jam Pulang Hari Kerja itu, dipakai tombol "Otomatis". */
  autoCheckOutTime: string;
};

/** Absen masuk tanpa absen pulang → data untuk dialog/modal konfirmasi. */
export function describeMissedCheckout(
  checkIn: { workDate: Date; timestamp: Date },
  days: WorkDayConfig[],
): MissedCheckoutDay {
  return {
    workDate: toDateInputValue(checkIn.workDate),
    dayLabel: formatDayShortDate(checkIn.workDate),
    checkInTime: formatTime(checkIn.timestamp),
    autoCheckOutTime: autoCheckOutTimeFor(checkIn.workDate, days),
  };
}
