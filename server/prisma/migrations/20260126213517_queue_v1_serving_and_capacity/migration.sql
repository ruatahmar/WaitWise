/*
  Warnings:

  - You are about to drop the column `maxActiveUsers` on the `Queue` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `QueueUser` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[adminId,name]` on the table `Queue` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[queueId,token]` on the table `QueueUser` will be added. If there are existing duplicate values, this will fail.
  - Made the column `token` on table `QueueUser` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "QueueStatus" ADD VALUE 'COMPLETED';

-- DropIndex
DROP INDEX "QueueUser_queueId_position_key";

-- DropIndex
DROP INDEX "QueueUser_token_key";

-- AlterTable
ALTER TABLE "Queue" DROP COLUMN "maxActiveUsers",
ADD COLUMN     "maxServing" INTEGER DEFAULT 1,
ADD COLUMN     "maxSize" INTEGER;

-- AlterTable
ALTER TABLE "QueueUser" DROP COLUMN "position",
ADD COLUMN     "priorityBoost" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "token" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Queue_adminId_name_key" ON "Queue"("adminId", "name");

-- CreateIndex
CREATE INDEX "QueueUser_queueId_status_idx" ON "QueueUser"("queueId", "status");

-- CreateIndex
CREATE INDEX "QueueUser_queueId_status_priorityBoost_joinedAt_idx" ON "QueueUser"("queueId", "status", "priorityBoost", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QueueUser_queueId_token_key" ON "QueueUser"("queueId", "token");
