/**
 * Label & varian badge untuk status rekap harian.
 *
 * Sengaja ditaruh di `lib/` (bukan di komponen tabel) supaya bisa dipakai dari
 * server component juga — nilai yang diekspor dari file `"use client"` berubah
 * jadi client reference kalau diimpor server, sehingga isinya tidak terbaca.
 */

import { Role, type Attendance } from "@/generated/prisma";
import { formatTime } from "./date";
import { formatDistance } from "./geo";
import {
  WORK_MODE_LABEL,
  type AttendanceApprovalValue,
  type WorkModeValue,
} from "./work-mode";

/**
 * Absensi luar radius selalu satu langkah, ditentukan dari role pemiliknya —
 * karyawan/admin menunggu SUPERVISOR, supervisor menunggu MANAGER. Manager
 * tidak punya siapa pun di atasnya (null = disetujui otomatis saat dicatat,
 * lihat `submitAttendance` di `app/action/attendance.action.ts`).
 */
export function resolveAttendanceReviewerRole(ownerRole: Role): Role | null {
  if (ownerRole === Role.MANAGER) return null;
  if (ownerRole === Role.SUPERVISOR) return Role.MANAGER;

  return Role.SUPERVISOR;
}

/** Kebalikan dari `resolveAttendanceReviewerRole` — role pemilik absensi mana
 * saja yang jadi giliran seorang reviewer. Dipakai untuk memfilter antrean
 * approval. ADMIN boleh memutuskan absensi role mana pun (selain miliknya
 * sendiri — lihat `canReviewAttendance`). */
export function ownerRolesForAttendanceReviewer(reviewerRole: Role): Role[] {
  if (reviewerRole === Role.ADMIN) {
    return [Role.EMPLOYEE, Role.ADMIN, Role.SUPERVISOR, Role.MANAGER];
  }
  if (reviewerRole === Role.SUPERVISOR) return [Role.EMPLOYEE, Role.ADMIN];
  if (reviewerRole === Role.MANAGER) return [Role.SUPERVISOR];

  return [];
}

/**
 * Siapa yang boleh memutuskan absensi luar radius milik `owner`: reviewer pada
 * jenjang pemiliknya (`resolveAttendanceReviewerRole`), atau ADMIN. Tidak ada
 * yang boleh memutuskan absensinya sendiri.
 */
export function canReviewAttendance(
  reviewer: { id: string; role: Role },
  owner: { id: string; role: Role },
): boolean {
  if (reviewer.id === owner.id) return false;
  if (reviewer.role === Role.ADMIN) return true;

  return resolveAttendanceReviewerRole(owner.role) === reviewer.role;
}

export type AttendanceTypeValue = "CHECK_IN" | "CHECK_OUT";

export const ATTENDANCE_TYPE_LABEL: Record<AttendanceTypeValue, string> = {
  CHECK_IN: "Absen Masuk",
  CHECK_OUT: "Absen Pulang",
};

/**
 * Tujuh klasifikasi kehadiran. `HADIR_DIKANTOR` mencakup yang tepat waktu
 * maupun yang terlambat — keterlambatan tetap dicatat, tapi sebagai atribut
 * (`Attendance.isLate`), bukan status tersendiri.
 *
 * `LUAR_RADIUS` dan `DINAS_LUAR` sengaja dipisah meski sama-sama "hadir di
 * luar kantor": `LUAR_RADIUS` datang dari `WorkMode` — klaim sepihak karyawan
 * saat absen di luar radius kantor. `DINAS_LUAR` di sini datang dari
 * `FieldAssignment` yang sudah disetujui MANAGER — tidak menuntut absen sama
 * sekali. Keduanya tidak pernah muncul bersamaan untuk hari yang sama, karena
 * `LUAR_RADIUS` hanya muncul kalau ada absen, `DINAS_LUAR` hanya muncul kalau
 * tidak ada (lihat `ReportService.buildRecap`).
 */
export type RecapStatus =
  | "HADIR_DIKANTOR"
  | "LUAR_RADIUS"
  | "DINAS_LUAR"
  | "SAKIT"
  | "IZIN"
  | "ALFA"
  | "CUTI";

/**
 * Status satu hari di rekap: enam klasifikasi di atas + hari yang memang tidak
 * menuntut kehadiran. `LIBUR` bukan klasifikasi kehadiran — tanpa dia, setiap
 * akhir pekan dan tanggal merah akan terbaca `ALFA`.
 */
export type DayStatus = RecapStatus | "LIBUR";

/** Status satu kotak kalender: status hari + hari yang belum ada datanya. */
export type CalendarStatus = DayStatus | "KOSONG";

export const RECAP_STATUS_OPTIONS: RecapStatus[] = [
  "HADIR_DIKANTOR",
  "LUAR_RADIUS",
  "DINAS_LUAR",
  "SAKIT",
  "IZIN",
  "ALFA",
  "CUTI",
];

/** Pilihan filter di tabel rekap — enam klasifikasi + hari libur. */
export const DAY_STATUS_OPTIONS: DayStatus[] = [
  ...RECAP_STATUS_OPTIONS,
  "LIBUR",
];

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  HADIR_DIKANTOR: WORK_MODE_LABEL.HADIR_DIKANTOR,
  LUAR_RADIUS: WORK_MODE_LABEL.LUAR_RADIUS,
  // Beda dari `LUAR_RADIUS` di atas — lihat komentar pada `RecapStatus`.
  DINAS_LUAR: "Dinas Luar",
  SAKIT: WORK_MODE_LABEL.SAKIT,
  IZIN: WORK_MODE_LABEL.IZIN,
  ALFA: "Alfa",
  CUTI: WORK_MODE_LABEL.CUTI,
  LIBUR: "Libur",
};

export const DAY_STATUS_VARIANT: Record<
  DayStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  HADIR_DIKANTOR: "secondary",
  LUAR_RADIUS: "default",
  DINAS_LUAR: "default",
  SAKIT: "outline",
  IZIN: "outline",
  ALFA: "destructive",
  CUTI: "outline",
  LIBUR: "outline",
};

/** Warna titik status — dipakai di ringkasan dashboard, bukan satu-satunya penanda. */
export const DAY_STATUS_DOT: Record<DayStatus, string> = {
  HADIR_DIKANTOR: "bg-chart-hadir",
  LUAR_RADIUS: "bg-chart-3",
  DINAS_LUAR: "bg-chart-1",
  SAKIT: "bg-chart-5",
  IZIN: "bg-muted-foreground/60",
  ALFA: "bg-destructive",
  CUTI: "bg-chart-4",
  LIBUR: "bg-border",
};

export const CALENDAR_STATUS_LABEL: Record<CalendarStatus, string> = {
  ...DAY_STATUS_LABEL,
  KOSONG: "Belum ada data",
};

export const CALENDAR_STATUS_DOT: Record<CalendarStatus, string> = {
  ...DAY_STATUS_DOT,
  KOSONG: "bg-border",
};

/**
 * Foto, koordinat, dan status radius bernilai null untuk absensi yang dicatat
 * admin secara manual — saat itu karyawan memang tidak sedang memegang HP-nya.
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
  /** Dicatat manual oleh admin, bukan absen langsung dengan foto + GPS. */
  isManual: boolean;
  /** Mode yang diklaim karyawan saat absen. */
  workMode: WorkModeValue;
  /** Mode final setelah keputusan admin — `approvedMode ?? workMode`. */
  effectiveMode: WorkModeValue;
  /** Null kalau absensinya di dalam radius dan tidak perlu persetujuan. */
  approvalStatus: AttendanceApprovalValue | null;
  /** Penjelasan yang ditulis karyawan saat absen di luar radius. */
  workModeDetail: string | null;
  reviewNote: string | null;
};

export type RecapRow = {
  userId: string;
  name: string;
  position: string;
  status: DayStatus;
  statusDetail: string | null;
  checkIn: RecapEntry | null;
  checkOut: RecapEntry | null;
  /** Sudah absen masuk tapi tidak pernah absen pulang, dan harinya sudah lewat. */
  missingCheckOut: boolean;
  /** Absensi luar radius yang masih menunggu keputusan admin. */
  pendingApproval: boolean;
};

/** Absensi apa saja yang perlu dicek: hanya kolom yang memengaruhi status rekap. */
type ReviewableAttendance = {
  isLate: boolean;
  workMode: WorkModeValue;
  approvedMode: WorkModeValue | null;
  approvalStatus: AttendanceApprovalValue | null;
};

/**
 * Mode final sebuah absensi: keputusan admin kalau ada, kalau tidak ya klaim
 * karyawannya sendiri. Satu-satunya tempat `approvedMode` dibaca.
 */
export function effectiveWorkMode(
  attendance: ReviewableAttendance,
): WorkModeValue {
  return attendance.approvedMode ?? attendance.workMode;
}

/**
 * Absensi yang ditolak admin tidak boleh ikut dihitung di rekap mana pun.
 * Barisnya tetap ada di database sebagai jejak, tapi diperlakukan seolah tidak
 * pernah ada saat menyusun status hari.
 */
export function isVoidedAttendance(
  attendance: ReviewableAttendance | null,
): boolean {
  return attendance?.approvalStatus === "REJECTED";
}

/**
 * Absensi luar radius yang masih menunggu keputusan admin. Sengaja jadi penanda
 * di samping status, bukan status tersendiri — hari itu tetap terbaca sebagai
 * mode yang diklaim karyawan, dengan catatan bahwa admin belum memutuskan.
 */
export function isPendingApproval(
  attendance: ReviewableAttendance | null,
): boolean {
  return attendance?.approvalStatus === "PENDING";
}

/**
 * Status hari dari absen masuk yang sudah lolos `isVoidedAttendance`.
 *
 * Satu-satunya tempat mode kerja diterjemahkan jadi status rekap — dipakai
 * `ReportService.buildRecap` maupun `buildDailyRecap`.
 */
export function statusFromCheckIn(checkIn: ReviewableAttendance): RecapStatus {
  return effectiveWorkMode(checkIn);
}

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
    workMode: attendance.workMode,
    effectiveMode: effectiveWorkMode(attendance),
    approvalStatus: attendance.approvalStatus,
    workModeDetail: attendance.workModeDetail,
    reviewNote: attendance.reviewNote,
  };
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
  /** Absensi luar radius yang masih menunggu keputusan admin. */
  pendingApproval: boolean;
  isToday: boolean;
  /** Hari yang sudah lewat. */
  isPast: boolean;
};

export type AttendanceMonth = {
  key: string;
  label: string;
  days: AttendanceDay[];
};

export type AttendanceSummary = {
  hadirDikantor: number;
  /** Hari absen dengan klaim `WorkMode.LUAR_RADIUS` — beda dari `dinasLuar` di bawah. */
  luarRadius: number;
  /** Hari ditutupi `FieldAssignment` yang disetujui — beda dari `luarRadius` di atas. */
  dinasLuar: number;
  sakit: number;
  izin: number;
  alfa: number;
  cuti: number;
  libur: number;
  /**
   * Hari `HADIR_DIKANTOR` yang jam masuknya melewati toleransi. Atribut, bukan
   * status — sudah ikut terhitung di `hadirDikantor`.
   */
  terlambat: number;
  /** Absensi luar radius yang masih menunggu keputusan admin. */
  pendingApproval: number;
  outsideRadius: number;
  /** Hari yang absen masuknya ada tapi absen pulangnya tidak pernah tercatat. */
  missingCheckOut: number;
  /** Total hari yang dihitung hadir bekerja: di kantor + luar radius + dinas luar. */
  totalHadir: number;
  /** Rata-rata jam absen masuk, mis. "08:12". Null kalau belum ada absensi. */
  averageCheckIn: string | null;
};

/** Indeks hari dengan Senin sebagai kolom pertama (Senin 0 … Minggu 6). */
export function getWeekdayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}
