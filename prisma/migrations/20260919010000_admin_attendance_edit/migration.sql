-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "createdByAdminId" TEXT,
ADD COLUMN     "editNote" TEXT,
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "editedById" TEXT,
ADD COLUMN     "originalTimestamp" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Overtime" ADD COLUMN     "editNote" TEXT,
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "editedById" TEXT,
ADD COLUMN     "originalEndAt" TIMESTAMP(3),
ADD COLUMN     "originalStartAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Overtime" ADD CONSTRAINT "Overtime_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: baris yang dicatat lewat form admin punya isManual + reviewedById
-- (konfirmasi absen pulang oleh karyawan sendiri tidak pernah mengisi reviewedById).
UPDATE "Attendance" SET "createdByAdminId" = "reviewedById" WHERE "isManual" = true AND "reviewedById" IS NOT NULL;
