-- CreateEnum
CREATE TYPE "ApprovalLogType" AS ENUM ('LEAVE', 'OVERTIME', 'FIELD_ASSIGNMENT');

-- CreateTable
CREATE TABLE "ApprovalLog" (
    "id" TEXT NOT NULL,
    "type" "ApprovalLogType" NOT NULL,
    "requestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "stage" "Role" NOT NULL,
    "status" "AttendanceApproval" NOT NULL,
    "note" TEXT,
    "requesterId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalLog_reviewerId_reviewedAt_idx" ON "ApprovalLog"("reviewerId", "reviewedAt");

-- CreateIndex
CREATE INDEX "ApprovalLog_type_requestId_idx" ON "ApprovalLog"("type", "requestId");

-- AddForeignKey
ALTER TABLE "ApprovalLog" ADD CONSTRAINT "ApprovalLog_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
