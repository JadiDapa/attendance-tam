-- CreateTable
CREATE TABLE "WorkDay" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT true,
    "checkInTime" TEXT NOT NULL,
    "checkOutTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkDay_dayOfWeek_key" ON "WorkDay"("dayOfWeek");

-- Isi 7 hari dari jadwal lama supaya perilaku tidak berubah setelah migrasi:
-- Senin–Jumat memakai jam yang sudah tersimpan, Sabtu & Minggu libur
-- (sama dengan asumsi isWeekend() sebelum hari kerja bisa diatur admin).
INSERT INTO "WorkDay" ("id", "dayOfWeek", "isWorkingDay", "checkInTime", "checkOutTime", "updatedAt")
SELECT
    md5(random()::text || clock_timestamp()::text),
    d.day,
    d.day BETWEEN 1 AND 5,
    COALESCE(s."checkInTime", '08:00'),
    COALESCE(s."checkOutTime", '17:00'),
    CURRENT_TIMESTAMP
FROM generate_series(0, 6) AS d(day)
LEFT JOIN LATERAL (
    SELECT "checkInTime", "checkOutTime"
    FROM "WorkSchedule"
    WHERE "isActive" = true
    ORDER BY "createdAt" ASC
    LIMIT 1
) s ON true;

-- AlterTable
ALTER TABLE "WorkSchedule" DROP COLUMN "checkInTime",
DROP COLUMN "checkOutTime";
