/*
  Warnings:

  - A unique constraint covering the columns `[processingId]` on the table `resumes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `processingId` to the `resumes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ResumeStatus" ADD VALUE 'TEXT_EXTRACTED';
ALTER TYPE "ResumeStatus" ADD VALUE 'READY_FOR_ANALYSIS';
ALTER TYPE "ResumeStatus" ADD VALUE 'ANALYZED';

-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "processingId" TEXT NOT NULL,
ADD COLUMN     "processingStage" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "resumes_processingId_key" ON "resumes"("processingId");
