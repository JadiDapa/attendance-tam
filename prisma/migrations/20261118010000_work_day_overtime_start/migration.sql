-- Jam Mulai Lembur per Hari Kerja. Hanya menambah kolom (dengan nilai default,
-- jadi kode lama yang membuat baris `WorkDay` tetap jalan), lalu di-backfill
-- dengan Jam Pulang + 1 jam (produksi: Senin–Jumat 18:00, Sabtu 15:00,
-- Minggu 18:00). Jam Pulang 23:00 ke atas dibatasi 23:59 supaya tidak
-- berputar melewati tengah malam.

-- AlterTable
ALTER TABLE "WorkDay" ADD COLUMN "overtimeStartTime" TEXT NOT NULL DEFAULT '18:00';

UPDATE "WorkDay"
SET "overtimeStartTime" = CASE
  WHEN "checkOutTime"::time >= TIME '23:00' THEN '23:59'
  ELSE to_char("checkOutTime"::time + INTERVAL '1 hour', 'HH24:MI')
END;
