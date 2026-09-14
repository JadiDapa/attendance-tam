-- CreateEnum
CREATE TYPE "LeaveStage" AS ENUM ('ADMIN', 'SUPERVISOR', 'MANAGER', 'DONE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'SUPERVISOR';
ALTER TYPE "Role" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "stage" "LeaveStage" NOT NULL DEFAULT 'ADMIN';

-- CreateIndex
CREATE INDEX "LeaveRequest_status_stage_idx" ON "LeaveRequest"("status", "stage");
