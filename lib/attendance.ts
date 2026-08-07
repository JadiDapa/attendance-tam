/**
 * Label & varian badge untuk status rekap harian.
 *
 * Sengaja ditaruh di `lib/` (bukan di komponen tabel) supaya bisa dipakai dari
 * server component juga — nilai yang diekspor dari file `"use client"` berubah
 * jadi client reference kalau diimpor server, sehingga isinya tidak terbaca.
 */

import type { Attendance, RadiusReviewStatus } from "@/generated/prisma";
import { formatTime } from "./date";
import { formatDistance } from "./geo";

export type RecapStatus =
  | "HADIR"
  | "TERLAMBAT"
  | "IZIN"
  | "ALPA"
  | "LIBUR"
  | "PERLU_VERIFIKASI";

export const RECAP_STATUS_OPTIONS: RecapStatus[] = [
  "HADIR",
  "TERLAMBAT",
  "IZIN",
  "ALPA",
  "LIBUR",
  "PERLU_VERIFIKASI",
];

export const RECAP_STATUS_LABEL: Record<RecapStatus, string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  ALPA: "Tidak absen",
  LIBUR: "Libur",
  PERLU_VERIFIKASI: "Perlu verifikasi",
};

export const RECAP_STATUS_VARIANT: Record<
  RecapStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  HADIR: "secondary",
  TERLAMBAT: "destructive",
  IZIN: "outline",
  ALPA: "destructive",
  LIBUR: "outline",
  PERLU_VERIFIKASI: "destructive",
};

/** Warna titik status — dipakai di ringkasan dashboard, bukan satu-satunya penanda. */
export const RECAP_STATUS_DOT: Record<RecapStatus, string> = {
  HADIR: "bg-chart-hadir",
  TERLAMBAT: "bg-chart-terlambat",
  IZIN: "bg-muted-foreground/60",
  ALPA: "bg-destructive",
  LIBUR: "bg-border",
  PERLU_VERIFIKASI: "bg-chart-terlambat",
};

/**
 * Foto, koordinat, dan status radius bernilai null untuk absensi hasil koreksi
 * manual — saat itu karyawan memang tidak sedang memegang HP-nya.
 */
export type RecapEntry = {
  label: string;
  time: string;
  isLate: boolean;
  isWithinRadius: boolean | null;
  distanceLabel: string | null;
  accuracyLabel: string | null;
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Dicatat lewat koreksi admin, bukan absen langsung dengan foto + GPS. */
  isManual: boolean;
  /** Null kalau absensinya normal dan tidak perlu diverifikasi admin. */
  reviewStatus: RadiusReviewStatus | null;
  reviewNote: string | null;
};

export type RecapRow = {
  userId: string;
  name: string;
  position: string;
  status: RecapStatus;
  statusDetail: string | null;
  checkIn: RecapEntry | null;
  checkOut: RecapEntry | null;
  /** Sudah absen masuk tapi tidak pernah absen pulang, dan harinya sudah lewat. */
  missingCheckOut: boolean;
};

/**
 * Baris absensi → data siap render: semua angka/tanggal sudah jadi teks di
 * server, jadi timezone tidak ikut perangkat karyawan.
 */
export function toRecapEntry(
  label: string,
  attendance: Attendance,
): RecapEntry {
  return {
    label,
    time: formatTime(attendance.timestamp),
    isLate: attendance.isLate,
    isWithinRadius: attendance.isWithinRadius,
    distanceLabel:
      attendance.distanceMeters != null
        ? formatDistance(attendance.distanceMeters)
        : null,
    accuracyLabel:
      attendance.accuracyMeters != null
        ? `±${formatDistance(attendance.accuracyMeters)}`
        : null,
    photoUrl: attendance.photoUrl,
    latitude: attendance.latitude,
    longitude: attendance.longitude,
    isManual: attendance.isManual,
    reviewStatus: attendance.reviewStatus,
    reviewNote: attendance.reviewNote,
  };
}

/** Absensi apa saja yang perlu dicek: hanya kolom yang memengaruhi status rekap. */
type ReviewableAttendance = {
  isLate: boolean;
  reviewStatus: RadiusReviewStatus | null;
};

/**
 * Absensi yang dianulir admin tidak boleh ikut dihitung di rekap mana pun.
 * Barisnya tetap ada di database sebagai jejak, tapi diperlakukan seolah tidak
 * pernah ada saat menyusun status hari.
 */
export function isVoidedAttendance(
  attendance: ReviewableAttendance | null,
): boolean {
  return attendance?.reviewStatus === "ALPA";
}

/**
 * Status hari dari absen masuk yang sudah lolos `isVoidedAttendance`.
 *
 * Satu-satunya tempat keputusan verifikasi radius diterjemahkan jadi status
 * rekap — dipakai `ReportService.buildRecap` dan `buildDailyRecap`.
 */
export function statusFromCheckIn(checkIn: ReviewableAttendance): RecapStatus {
  if (checkIn.reviewStatus === "PENDING") return "PERLU_VERIFIKASI";
  if (checkIn.reviewStatus === "IZIN" || checkIn.reviewStatus === "SAKIT") {
    return "IZIN";
  }

  return checkIn.isLate ? "TERLAMBAT" : "HADIR";
}

/**
 * Absensi yang menggantung: sudah absen masuk, tidak pernah absen pulang, dan
 * tanggalnya sudah lewat. Sengaja dihitung saat render — tidak ada job yang
 * membuat baris CHECK_OUT palsu, jadi data absensi tetap apa adanya.
 */
export function isMissingCheckOut(input: {
  hasCheckIn: boolean;
  hasCheckOut: boolean;
  workDate: Date;
  today: Date;
}): boolean {
  return (
    input.hasCheckIn &&
    !input.hasCheckOut &&
    input.workDate.getTime() < input.today.getTime()
  );
}

/** Status satu kotak kalender: status rekap + hari yang belum ada datanya. */
export type CalendarStatus = RecapStatus | "KOSONG";

export const CALENDAR_STATUS_LABEL: Record<CalendarStatus, string> = {
  ...RECAP_STATUS_LABEL,
  KOSONG: "Belum ada data",
};

export const CALENDAR_STATUS_DOT: Record<CalendarStatus, string> = {
  ...RECAP_STATUS_DOT,
  KOSONG: "bg-border",
};

/**
 * Satu hari absensi milik seorang karyawan, sudah jadi teks. Dipakai bersama
 * oleh tampilan kalender dan tampilan tabel supaya keduanya tidak pernah
 * menampilkan angka yang berbeda.
 */
export type AttendanceDay = {
  /** "YYYY-MM-DD" */
  key: string;
  dayOfMonth: number;
  /** Senin 0 … Minggu 6 — menentukan kolom kotak pertama tiap bulan. */
  weekdayIndex: number;
  dateLabel: string;
  status: CalendarStatus;
  /** Keterangan tambahan, mis. jenis izin atau nama hari libur. */
  statusDetail: string | null;
  checkIn: RecapEntry | null;
  checkOut: RecapEntry | null;
  /** Lama kerja antara absen masuk dan pulang, mis. "8j 15m". */
  durationLabel: string | null;
  /** Sudah absen masuk tapi tidak pernah absen pulang, dan harinya sudah lewat. */
  missingCheckOut: boolean;
  isToday: boolean;
  /** Hari yang sudah lewat — menentukan boleh/tidaknya diajukan koreksi. */
  isPast: boolean;
};

export type AttendanceMonth = {
  key: string;
  label: string;
  days: AttendanceDay[];
};

export type AttendanceSummary = {
  hadir: number;
  terlambat: number;
  izin: number;
  alpa: number;
  libur: number;
  /** Absensi luar radius yang masih menunggu keputusan admin. */
  perluVerifikasi: number;
  outsideRadius: number;
  /** Hari yang absen masuknya ada tapi absen pulangnya tidak pernah tercatat. */
  missingCheckOut: number;
  /** Hari kerja yang sudah lewat dan wajib absen (izin tidak dihitung). */
  expected: number;
  /** Rata-rata jam absen masuk, mis. "08:12". Null kalau belum ada absensi. */
  averageCheckIn: string | null;
};

/** Indeks hari dengan Senin sebagai kolom pertama (Senin 0 … Minggu 6). */
export function getWeekdayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}
