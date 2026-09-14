import { EmploymentStatus, Gender, MaritalStatus, Religion } from "@/generated/prisma";

export const GENDER_LABEL: Record<Gender, string> = {
  LAKI_LAKI: "Laki-laki",
  PEREMPUAN: "Perempuan",
};

export const RELIGION_LABEL: Record<Religion, string> = {
  ISLAM: "Islam",
  KRISTEN: "Kristen",
  KATOLIK: "Katolik",
  HINDU: "Hindu",
  BUDDHA: "Buddha",
  KONGHUCU: "Konghucu",
  LAINNYA: "Lainnya",
};

export const MARITAL_STATUS_LABEL: Record<MaritalStatus, string> = {
  BELUM_KAWIN: "Belum Kawin",
  KAWIN: "Kawin",
  CERAI_HIDUP: "Cerai Hidup",
  CERAI_MATI: "Cerai Mati",
};

export const EMPLOYMENT_STATUS_LABEL: Record<EmploymentStatus, string> = {
  PKWT: "PKWT (Kontrak)",
  PKWTT: "PKWTT (Tetap)",
};

/** "Rp 5.000.000" — dipakai panel Penggajian (read-only untuk karyawan). */
const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";

  return rupiahFormatter.format(value);
}
