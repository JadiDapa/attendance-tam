/**
 * Label, varian badge, dan penjelasan untuk mode kerja absensi (`WorkMode`) dan
 * persetujuan admin (`AttendanceApproval`).
 *
 * Sengaja memakai union string alih-alih enum dari Prisma — sama seperti
 * `lib/work-schedule.ts` — supaya bisa dipakai server component maupun komponen
 * client tanpa menarik Prisma client ke bundle.
 */

export type WorkModeValue =
  | "HADIR_DIKANTOR"
  | "WFH"
  | "DINAS_LUAR"
  | "SAKIT"
  | "IZIN"
  | "CUTI";

export type AttendanceApprovalValue = "PENDING" | "APPROVED" | "REJECTED";

export const WORK_MODE_LABEL: Record<WorkModeValue, string> = {
  HADIR_DIKANTOR: "Hadir di Kantor",
  WFH: "WFH",
  DINAS_LUAR: "Dinas Luar",
  SAKIT: "Sakit",
  IZIN: "Izin",
  CUTI: "Cuti",
};

/**
 * Alasan yang boleh dipilih karyawan sendiri saat absen di luar radius kantor.
 * Sakit/Izin/Cuti tidak ada di sini — jalurnya adalah pengajuan izin & cuti,
 * bukan absen. Admin masih bisa menimpanya jadi salah satu itu saat menyetujui.
 */
export const OUTSIDE_RADIUS_MODES: WorkModeValue[] = ["WFH", "DINAS_LUAR"];

/**
 * Mode yang bisa dipilih admin saat menyetujui absensi luar radius, termasuk
 * menimpa klaim karyawan. `HADIR_DIKANTOR` tetap tersedia untuk kasus GPS yang
 * meleset padahal karyawannya memang di kantor.
 */
export const APPROVAL_MODES: WorkModeValue[] = [
  "HADIR_DIKANTOR",
  "WFH",
  "DINAS_LUAR",
  "SAKIT",
  "IZIN",
  "CUTI",
];

/** Penjelasan akibat tiap pilihan — ditampilkan di dialog persetujuan admin. */
export const WORK_MODE_HINT: Record<WorkModeValue, string> = {
  HADIR_DIKANTOR:
    "Dianggap absen biasa di kantor — pembacaan GPS-nya dinilai tidak akurat. Aturan terlambat ikut berlaku lagi.",
  WFH: "Dihitung hadir, bekerja dari rumah. Tidak pernah dihitung terlambat.",
  DINAS_LUAR:
    "Dihitung hadir dengan tugas di luar kantor. Tidak pernah dihitung terlambat.",
  SAKIT: "Hari itu dihitung sakit, bukan kehadiran.",
  IZIN: "Hari itu dihitung izin, bukan kehadiran.",
  CUTI: "Hari itu dihitung cuti, bukan kehadiran.",
};

/** Petunjuk singkat di form absensi karyawan. */
export const OUTSIDE_RADIUS_HINT: Record<"WFH" | "DINAS_LUAR", string> = {
  WFH: "Bekerja dari rumah atau lokasi lain di luar kantor.",
  DINAS_LUAR: "Tugas kantor di lokasi lain: kunjungan klien, acara, survei.",
};

export const APPROVAL_LABEL: Record<AttendanceApprovalValue, string> = {
  PENDING: "Menunggu approval",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export const APPROVAL_VARIANT: Record<
  AttendanceApprovalValue,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  APPROVED: "secondary",
  REJECTED: "destructive",
};

/** Mode yang tidak pernah dihitung terlambat — hanya kehadiran di kantor yang dinilai. */
export function isLateEligible(mode: WorkModeValue): boolean {
  return mode === "HADIR_DIKANTOR";
}
