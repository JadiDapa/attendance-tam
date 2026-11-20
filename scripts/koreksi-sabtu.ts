/**
 * Skrip sekali jalan (tiket 06): koreksi absen pulang Sabtu yang tercatat
 * 17:00 oleh tombol "Otomatis" lama menjadi Jam Pulang Sabtu di `WorkDay`
 * (14:00). Baris tampil "Diubah admin" dengan jam asli tersimpan di
 * `originalTimestamp`. Aturan sasaran: `lib/saturday-correction.ts`.
 *
 * Langkah:
 *   1. BACKUP database dulu (pg_dump).
 *   2. Dry-run dulu, periksa tabelnya:   npx tsx scripts/koreksi-sabtu.ts
 *   3. Baru tulis:                        npx tsx scripts/koreksi-sabtu.ts --apply
 *
 * Ketiganya (plus restore ke salinan lokal dan gladi --apply) dipandu:
 *   scripts/wizard-skrip-produksi.sh
 *
 * Membaca `DATABASE_URL` dari environment atau `.env`. Tanpa `--apply` tidak
 * ada yang ditulis. `--apply` berjalan dalam satu transaksi dan idempoten —
 * jalan kedua mengoreksi 0 baris. Berhenti total kalau ada yang tidak cocok:
 * migrasi rilis tiket 04 belum diterapkan, Jam Pulang Sabtu di `WorkDay` bukan
 * Hari Kerja 14:00, akun Administrator (admin@tarunagroup.co.id) tidak ada /
 * bukan ADMIN / nonaktif, atau (khusus --apply) ada baris konflik yang absen
 * masuknya tidak sebelum 14:00.
 */

import "dotenv/config";

import { formatTime, formatWorkDate } from "@/lib/date";
import type { SaturdayCorrection } from "@/lib/saturday-correction";
import { SaturdayCorrectionService } from "@/servers/services/saturday-correction.service";

const args = process.argv.slice(2);
const unknown = args.filter((arg) => arg !== "--apply");

if (unknown.length > 0) {
  console.error(`Argumen tidak dikenal: ${unknown.join(" ")}\nPakai: npx tsx scripts/koreksi-sabtu.ts [--apply]`);
  process.exit(2);
}

const apply = args.includes("--apply");

function databaseLabel() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return `${url.host}${url.pathname}`;
  } catch {
    return "(DATABASE_URL tidak terbaca)";
  }
}

const toRow = (correction: SaturdayCorrection) => ({
  id: correction.id,
  userId: correction.userId,
  tanggal: formatWorkDate(correction.workDate),
  jam: `${formatTime(correction.from)} → ${formatTime(correction.to)}`,
});

async function main() {
  console.log(`Database : ${databaseLabel()}`);
  console.log(`Mode     : ${apply ? "APPLY (menulis)" : "dry-run (tidak menulis)"}\n`);

  const preview = await SaturdayCorrectionService.preview();

  if (!preview.ok) {
    console.error(`✖ Berhenti: ${preview.error}`);
    return 1;
  }

  console.log(`Pengoreksi: ${preview.corrector.name} <${preview.corrector.email}>`);
  console.log(`Catatan   : ${preview.note}\n`);

  if (preview.corrections.length > 0) console.table(preview.corrections.map(toRow));
  if (preview.conflicts.length > 0) {
    console.log("\nKonflik — --apply menolak jalan sampai baris ini dikoreksi lewat dialog Edit di /admin/kehadiran:");
    console.table(
      preview.conflicts.map((row) => ({ ...toRow(row), alasan: row.reason })),
    );
  }

  console.log(
    `\nSasaran sebelum: ${preview.corrections.length} baris` +
      (preview.conflicts.length > 0 ? ` (+ ${preview.conflicts.length} konflik)` : ""),
  );

  if (!apply) {
    console.log("Dry-run selesai — tidak ada yang ditulis. Ulangi dengan --apply untuk menulis.");
    return 0;
  }

  const result = await SaturdayCorrectionService.apply();

  if (!result.ok) {
    console.error(`✖ Berhenti: ${result.error}`);
    return 1;
  }

  console.log(`Terkoreksi     : ${result.applied} baris`);
  console.log(`Sasaran sesudah: ${result.remaining} baris`);

  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => SaturdayCorrectionService.disconnect());
