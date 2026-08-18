-- Klasifikasi kehadiran baru: tujuh status, dengan absensi luar radius yang
-- wajib memilih WFH/Dinas Luar + penjelasan lalu menunggu persetujuan admin.
-- Sekaligus menghapus fitur koreksi absensi (diganti input manual oleh admin).

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('HADIR_DIKANTOR', 'WFH', 'DINAS_LUAR', 'SAKIT', 'IZIN', 'CUTI');

-- CreateEnum
CREATE TYPE "AttendanceApproval" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropFeature: koreksi absensi
ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_correctionId_fkey";
DROP INDEX IF EXISTS "Attendance_correctionId_key";
ALTER TABLE "Attendance" DROP COLUMN IF EXISTS "correctionId";
DROP TABLE IF EXISTS "AttendanceCorrection";
DROP TYPE IF EXISTS "CorrectionStatus";

-- DropOldRadiusReview
DROP INDEX IF EXISTS "Attendance_reviewStatus_workDate_idx";
ALTER TABLE "Attendance" DROP COLUMN IF EXISTS "reviewStatus";
DROP TYPE IF EXISTS "RadiusReviewStatus";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN "workMode" "WorkMode" NOT NULL DEFAULT 'HADIR_DIKANTOR';
ALTER TABLE "Attendance" ADD COLUMN "workModeDetail" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "approvalStatus" "AttendanceApproval";
ALTER TABLE "Attendance" ADD COLUMN "approvedMode" "WorkMode";

-- CreateIndex
CREATE INDEX "Attendance_approvalStatus_workDate_idx" ON "Attendance"("approvalStatus", "workDate");
