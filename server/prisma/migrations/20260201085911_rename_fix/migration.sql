/*
  Warnings:

  - You are about to drop the column `queueUserID` on the `QueueEvents` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "QueueEvents" DROP CONSTRAINT "QueueEvents_queueUserID_fkey";

-- AlterTable
ALTER TABLE "QueueEvents" DROP COLUMN "queueUserID",
ADD COLUMN     "queueUserId" INTEGER;

-- AddForeignKey
ALTER TABLE "QueueEvents" ADD CONSTRAINT "QueueEvents_queueUserId_fkey" FOREIGN KEY ("queueUserId") REFERENCES "QueueUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
