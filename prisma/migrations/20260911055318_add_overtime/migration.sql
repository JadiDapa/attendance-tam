-- CreateEnum
CREATE TYPE "OvertimeStage" AS ENUM ('ADMIN', 'SUPERVISOR', 'DONE');

-- CreateTable
CREATE TABLE "Overtime" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "endAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "status" "AttendanceApproval" NOT NULL DEFAULT 'PENDING',
    "stage" "OvertimeStage" NOT NULL DEFAULT 'ADMIN',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Overtime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Overtime_userId_startAt_idx" ON "Overtime"("userId", "startAt");

-- CreateIndex
CREATE INDEX "Overtime_status_stage_idx" ON "Overtime"("status", "stage");

-- CreateIndex
CREATE INDEX "Overtime_workDate_idx" ON "Overtime"("workDate");

-- AddForeignKey
ALTER TABLE "Overtime" ADD CONSTRAINT "Overtime_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Overtime" ADD CONSTRAINT "Overtime_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
