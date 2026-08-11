/*
  Warnings:

  - Added the required column `model` to the `FaceEmbedding` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FaceEmbedding" ADD COLUMN     "model" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "FaceEmbedding_userId_idx" ON "FaceEmbedding"("userId");
