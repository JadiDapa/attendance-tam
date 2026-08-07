/**
 * Label & varian badge untuk verifikasi absensi di luar radius.
 *
 * Sama seperti `lib/leave.ts` dan `lib/correction.ts`: ditaruh di `lib/` supaya
 * bisa diimpor server component maupun komponen client.
 */

export type RadiusReviewStatusValue =
  | "PENDING"
  | "VALID"
  | "ALPA"
  | "IZIN"
  | "SAKIT";

/** Keputusan yang bisa diambil admin — `PENDING` bukan pilihan, itu keadaan awal. */
export const RADIUS_DECISION_OPTIONS: Exclude<
  RadiusReviewStatusValue,
  "PENDING"
>[] = ["VALID", "ALPA", "IZIN", "SAKIT"];

export const RADIUS_REVIEW_LABEL: Record<RadiusReviewStatusValue, string> = {
  PENDING: "Perlu verifikasi",
  VALID: "Absensi sah",
  ALPA: "Dianulir (tidak absen)",
  IZIN: "Dikonversi jadi izin",
  SAKIT: "Dikonversi jadi sakit",
};

/** Teks singkat untuk badge di tabel. */
export const RADIUS_REVIEW_SHORT: Record<RadiusReviewStatusValue, string> = {
  PENDING: "Perlu verifikasi",
  VALID: "Sah",
  ALPA: "Dianulir",
  IZIN: "Izin",
  SAKIT: "Sakit",
};

export const RADIUS_REVIEW_VARIANT: Record<
  RadiusReviewStatusValue,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "destructive",
  VALID: "secondary",
  ALPA: "destructive",
  IZIN: "outline",
  SAKIT: "outline",
};

/** Penjelasan akibat tiap keputusan — ditampilkan di dialog review admin. */
export const RADIUS_DECISION_HINT: Record<
  Exclude<RadiusReviewStatusValue, "PENDING">,
  string
> = {
  VALID: "Dihitung hadir atau terlambat seperti absensi biasa.",
  ALPA: "Absensi dianulir — hari itu dihitung tidak absen.",
  IZIN: "Hari itu dihitung izin, bukan kehadiran.",
  SAKIT: "Hari itu dihitung sakit, bukan kehadiran.",
};
