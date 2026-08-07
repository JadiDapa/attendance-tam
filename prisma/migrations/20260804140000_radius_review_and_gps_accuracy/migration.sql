-- CreateEnum
CREATE TYPE "RadiusReviewStatus" AS ENUM ('PENDING', 'VALID', 'ALPA', 'IZIN', 'SAKIT');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "accuracyMeters" DOUBLE PRECISION,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewStatus" "RadiusReviewStatus",
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- AlterTable
ALTER TABLE "WorkSchedule" ADD COLUMN     "maxAccuracyMeters" INTEGER NOT NULL DEFAULT 100;

-- CreateIndex
CREATE INDEX "Attendance_reviewStatus_workDate_idx" ON "Attendance"("reviewStatus", "workDate");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: absensi lama yang terekam di luar radius belum pernah diverifikasi
-- siapa pun. Dimasukkan ke antrean supaya tidak diam-diam terus dihitung hadir.
UPDATE "Attendance" SET "reviewStatus" = 'PENDING' WHERE "isWithinRadius" = false;
