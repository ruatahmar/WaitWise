/*
  Warnings:

  - A unique constraint covering the columns `[userId,queueId]` on the table `QueueUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "QueueUser_userId_queueId_key" ON "QueueUser"("userId", "queueId");
