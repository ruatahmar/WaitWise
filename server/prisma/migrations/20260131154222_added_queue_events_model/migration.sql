-- CreateEnum
CREATE TYPE "QueueEventType" AS ENUM ('QUEUEUSER_CREATED', 'QUEUEUSER_SERVED', 'QUEUEUSER_COMPLETED', 'QUEUEUSER_LEFT', 'QUEUEUSER_LATE', 'QUEUEUSER_REJOINED', 'QUEUEUSER_MISSED');

-- CreateTable
CREATE TABLE "QueueEvents" (
    "id" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "queueUserID" INTEGER,
    "type" "QueueEventType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueEvents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QueueEvents" ADD CONSTRAINT "QueueEvents_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEvents" ADD CONSTRAINT "QueueEvents_queueUserID_fkey" FOREIGN KEY ("queueUserID") REFERENCES "QueueUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
