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
  | "LUAR_RADIUS"
  | "SAKIT"
  | "IZIN"
  | "CUTI";

export type AttendanceApprovalValue = "PENDING" | "APPROVED" | "REJECTED";

/**
 * `LUAR_RADIUS` BEDA dari "Dinas Luar" (`FieldAssignment`) — ini klaim
 * sepihak karyawan saat GPS-nya di luar radius kantor pas absen, bukan
 * penugasan dinas luar yang sudah direncanakan & disetujui duluan.
 */
export const WORK_MODE_LABEL: Record<WorkModeValue, string> = {
  HADIR_DIKANTOR: "Hadir di Kantor",
  LUAR_RADIUS: "Luar Radius",
  SAKIT: "Sakit",
  IZIN: "Izin",
  CUTI: "Cuti",
};

/**
 * Mode yang bisa dipilih admin saat menyetujui absensi luar radius, termasuk
 * menimpa klaim karyawan. `HADIR_DIKANTOR` tetap tersedia untuk kasus GPS yang
 * meleset padahal karyawannya memang di kantor.
 */
export const APPROVAL_MODES: WorkModeValue[] = [
  "HADIR_DIKANTOR",
  "LUAR_RADIUS",
  "SAKIT",
  "IZIN",
  "CUTI",
];

/** Penjelasan akibat tiap pilihan — ditampilkan di dialog persetujuan admin. */
export const WORK_MODE_HINT: Record<WorkModeValue, string> = {
  HADIR_DIKANTOR:
    "Dianggap absen biasa di kantor — pembacaan GPS-nya dinilai tidak akurat. Aturan terlambat ikut berlaku lagi.",
  LUAR_RADIUS:
    "Dihitung hadir meski absen di luar radius kantor. Tidak pernah dihitung terlambat.",
  SAKIT: "Hari itu dihitung sakit, bukan kehadiran.",
  IZIN: "Hari itu dihitung izin, bukan kehadiran.",
  CUTI: "Hari itu dihitung cuti, bukan kehadiran.",
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
