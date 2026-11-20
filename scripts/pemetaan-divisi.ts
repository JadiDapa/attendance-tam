/**
 * Skrip sekali jalan (tiket 14): buat Divisi Admin & Teknis beserta
 * Jabatannya, lalu petakan user ke Jabatan awal. Aturan pemetaan:
 * `lib/division-mapping.ts`.
 *
 * Daftar orangnya TIDAK ada di repo (data pribadi karyawan). Susun file
 * pemetaan lokal dari snapshot `User` produksi — format: contoh rekaan
 * `scripts/pemetaan-divisi.example.csv` (JSON juga boleh: array
 * `{ userId, email, jabatan }`). Nama
 * `pemetaan-divisi*.csv` / `pemetaan-divisi*.json` diabaikan git.
 * Setiap orang yang dipetakan harus disebut file (id + email), termasuk
 * semua Teknisi — tidak ada pemetaan otomatis dari teks jabatan.
 *
 * Langkah:
 *   1. BACKUP database dulu (pg_dump).
 *   2. Dry-run dulu, periksa tabelnya:   npx tsx scripts/pemetaan-divisi.ts FILE
 *   3. Baru tulis:                        npx tsx scripts/pemetaan-divisi.ts FILE --apply
 *
 * Ketiganya (plus restore ke salinan lokal dan gladi --apply) dipandu:
 *   scripts/wizard-skrip-produksi.sh
 *
 * Membaca `DATABASE_URL` dari environment atau `.env`. Tanpa `--apply` tidak
 * ada yang ditulis. `--apply` berjalan dalam satu transaksi dan idempoten —
 * jalan kedua tidak mengubah apa pun. Berhenti total kalau: migrasi tiket 09
 * belum diterapkan, id/email di file tidak cocok, Role tidak sesuai dugaan
 * Jabatannya, akun nonaktif disebut, user sudah memegang Jabatan lain, atau
 * ada user aktif berteks jabatan persis "Teknisi" yang tidak disebut file
 * (snapshot sudah usang — tambahkan orangnya ke file). Kalau sesudah apply
 * masih ada yang tersisa, seluruh transaksi dibatalkan.
 */

import "dotenv/config";

import { readFileSync } from "node:fs";

import { parseDivisionMapping, type MappingAssignment } from "@/lib/division-mapping";
import { DivisionMappingService } from "@/servers/services/division-mapping.service";

const USAGE = "Pakai: npx tsx scripts/pemetaan-divisi.ts FILE_PEMETAAN [--apply]";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const files = args.filter((arg) => arg !== "--apply");
const unknown = files.filter((arg) => arg.startsWith("-"));

if (unknown.length > 0 || files.length !== 1) {
  console.error(
    (unknown.length > 0 ? `Argumen tidak dikenal: ${unknown.join(" ")}\n` : "") + USAGE,
  );
  process.exit(2);
}

const [mappingFile] = files;

function databaseLabel() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return `${url.host}${url.pathname}`;
  } catch {
    return "(DATABASE_URL tidak terbaca)";
  }
}

// Email hanya untuk pencocokan, tidak dicetak.
const toRow = (assignment: MappingAssignment) => ({
  nama: assignment.name,
  jabatan: assignment.jabatan,
  divisi: assignment.division,
});

async function main() {
  console.log(`Database : ${databaseLabel()}`);
  console.log(`File     : ${mappingFile}`);
  console.log(`Mode     : ${apply ? "APPLY (menulis)" : "dry-run (tidak menulis)"}\n`);

  let content: string;
  try {
    content = readFileSync(mappingFile, "utf8");
  } catch (error) {
    console.error(`✖ Berhenti: file pemetaan tidak terbaca — ${(error as Error).message}`);
    return 1;
  }

  const parsed = parseDivisionMapping(content, mappingFile);
  if (!parsed.ok) {
    console.error(`✖ Berhenti: file pemetaan tidak sah:${parsed.errors.map((e) => `\n  - ${e}`).join("")}`);
    return 1;
  }

  const preview = await DivisionMappingService.preview(parsed.entries);
  if (!preview.ok) {
    console.error(`✖ Berhenti: ${preview.error}`);
    return 1;
  }

  console.log(`Divisi baru : ${preview.createDivisions.join(", ") || "-"}`);
  console.log(
    `Jabatan baru: ${preview.createPositions.map((p) => `${p.name} (${p.division})`).join(", ") || "-"}\n`,
  );

  if (preview.assignments.length > 0) {
    console.log("Akan diberi Jabatan:");
    console.table(preview.assignments.map(toRow));
  }
  if (preview.skipped.length > 0) {
    console.log("\nSudah memegang Jabatan yang sama — dilewati:");
    console.table(preview.skipped.map(toRow));
  }
  console.log(
    `\nTetap tanpa Jabatan (aktif, bukan Manager): ${preview.unmapped.map((u) => u.name).join(", ") || "-"}`,
  );
  console.log(
    `\nSebelum: ${preview.createDivisions.length} Divisi + ${preview.createPositions.length} Jabatan baru, ` +
      `${preview.assignments.length} user dipetakan, ${preview.skipped.length} dilewati`,
  );

  if (!apply) {
    console.log("Dry-run selesai — tidak ada yang ditulis. Ulangi dengan --apply untuk menulis.");
    return 0;
  }

  const result = await DivisionMappingService.apply(parsed.entries);
  if (!result.ok) {
    console.error(`✖ Berhenti: ${result.error}`);
    return 1;
  }

  console.log(`Dipetakan      : ${result.assigned} user`);
  console.log(`Sisa sesudahnya: ${result.remaining} (seharusnya 0)`);

  return result.remaining === 0 ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => DivisionMappingService.disconnect());
