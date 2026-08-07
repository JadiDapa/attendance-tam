/**
 * Label & varian badge untuk koreksi absensi.
 *
 * Sama seperti `lib/leave.ts`: ditaruh di `lib/` supaya bisa diimpor server
 * component maupun komponen client tanpa jadi client reference.
 */

export type CorrectionStatusValue = "PENDING" | "APPROVED" | "REJECTED";
export type AttendanceTypeValue = "CHECK_IN" | "CHECK_OUT";

export const CORRECTION_STATUS_LABEL: Record<CorrectionStatusValue, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export const CORRECTION_STATUS_VARIANT: Record<
  CorrectionStatusValue,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  APPROVED: "secondary",
  REJECTED: "destructive",
};

export const ATTENDANCE_TYPE_LABEL: Record<AttendanceTypeValue, string> = {
  CHECK_IN: "Absen Masuk",
  CHECK_OUT: "Absen Pulang",
};
