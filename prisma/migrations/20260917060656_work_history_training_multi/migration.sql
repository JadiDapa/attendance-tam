/*
  Warnings:

  - You are about to drop the column `trainingHistory` on the `Training` table. All the data in the column will be lost.
  - Added the required column `name` to the `Training` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Training_userId_key";

-- DropIndex
DROP INDEX "WorkHistory_userId_key";

-- AlterTable
ALTER TABLE "Training" DROP COLUMN "trainingHistory",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "organizer" TEXT,
ADD COLUMN     "period" TEXT;

-- CreateIndex
CREATE INDEX "Training_userId_idx" ON "Training"("userId");

-- CreateIndex
CREATE INDEX "WorkHistory_userId_idx" ON "WorkHistory"("userId");
