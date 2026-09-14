import { TransportationType } from "@/generated/prisma";

export const TRANSPORTATION_LABEL: Record<TransportationType, string> = {
  MOBIL_DINAS: "Mobil Dinas",
  KENDARAAN_PRIBADI: "Kendaraan Pribadi",
  PESAWAT: "Pesawat",
  KERETA: "Kereta",
  BUS: "Bus",
  LAINNYA: "Lainnya",
};

/** Format Rupiah tanpa desimal, mis. `1500000` -> "Rp 1.500.000". */
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}
