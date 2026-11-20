-- Lembur Sabtu dimulai tepat di Jam Pulang Sabtu (produksi: 14:00), bukan
-- Jam Pulang + 1 jam seperti nilai awal dari migrasi
-- 20261118010000_work_day_overtime_start. Senin–Jumat tetap 18:00.
--
-- Hanya menyentuh Sabtu yang masih memakai nilai awal itu, supaya Jam Mulai
-- Lembur yang sudah diubah admin di menu Waktu Kerja tidak tertimpa. Aman
-- dijalankan ulang: setelah diubah, syaratnya tidak terpenuhi lagi.

UPDATE "WorkDay"
SET "overtimeStartTime" = "checkOutTime"
WHERE "dayOfWeek" = 6
  AND "checkOutTime"::time < TIME '23:00'
  AND "overtimeStartTime" = to_char("checkOutTime"::time + INTERVAL '1 hour', 'HH24:MI');
