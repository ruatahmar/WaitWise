-- DropForeignKey
ALTER TABLE "QueueUser" DROP CONSTRAINT "QueueUser_queueId_fkey";

-- AddForeignKey
ALTER TABLE "QueueUser" ADD CONSTRAINT "QueueUser_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
