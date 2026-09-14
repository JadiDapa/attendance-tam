-- CreateEnum
CREATE TYPE "LeaveReasonCategory" AS ENUM ('CUTI_TAHUNAN', 'CUTI_KHUSUS', 'MELAHIRKAN', 'MENIKAH', 'IZIN_PRIBADI', 'IZIN_KELUARGA', 'KEPERLUAN_MENDESAK', 'DATANG_TERLAMBAT', 'PULANG_LEBIH_AWAL', 'TIDAK_MASUK', 'LAINNYA');

-- CreateEnum
CREATE TYPE "TransportationType" AS ENUM ('MOBIL_DINAS', 'KENDARAAN_PRIBADI', 'PESAWAT', 'KERETA', 'BUS', 'LAINNYA');

-- RenameColumn (preserves existing data — Prisma would otherwise propose
-- DROP COLUMN "reason" + ADD COLUMN "detail", which would erase the 3
-- existing LeaveRequest rows' free-text reason).
ALTER TABLE "LeaveRequest" RENAME COLUMN "reason" TO "detail";

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN "reasonCategory" "LeaveReasonCategory";

-- RenameColumn (FieldAssignment had 0 rows at migration time, but renamed for
-- consistency/safety rather than drop+add).
ALTER TABLE "FieldAssignment" RENAME COLUMN "reason" TO "activityDetail";

-- AlterTable
ALTER TABLE "FieldAssignment"
  ADD COLUMN "destinationCity" TEXT,
  ADD COLUMN "destinationAddress" TEXT,
  ADD COLUMN "purpose" TEXT,
  ADD COLUMN "companyName" TEXT,
  ADD COLUMN "transportation" "TransportationType",
  ADD COLUMN "transportationOther" TEXT,
  ADD COLUMN "estimatedCost" INTEGER;
