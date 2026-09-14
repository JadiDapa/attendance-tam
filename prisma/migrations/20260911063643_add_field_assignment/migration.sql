-- CreateTable
CREATE TABLE "FieldAssignment" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "attachmentUrl" TEXT NOT NULL,
    "status" "AttendanceApproval" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FieldAssignmentEmployees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FieldAssignmentEmployees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "FieldAssignment_status_idx" ON "FieldAssignment"("status");

-- CreateIndex
CREATE INDEX "FieldAssignment_startDate_endDate_idx" ON "FieldAssignment"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "_FieldAssignmentEmployees_B_index" ON "_FieldAssignmentEmployees"("B");

-- AddForeignKey
ALTER TABLE "FieldAssignment" ADD CONSTRAINT "FieldAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldAssignment" ADD CONSTRAINT "FieldAssignment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FieldAssignmentEmployees" ADD CONSTRAINT "_FieldAssignmentEmployees_A_fkey" FOREIGN KEY ("A") REFERENCES "FieldAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FieldAssignmentEmployees" ADD CONSTRAINT "_FieldAssignmentEmployees_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
