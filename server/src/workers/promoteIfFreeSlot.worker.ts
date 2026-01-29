import { Worker } from "bullmq";
import { prisma } from "../db/prisma.js";
import { promoteIfAvailableSlot } from "../controllers/v1/queues.controller.js";

export const promoteIfFreeSlotWorker = new Worker(
    "promote-if-free",
    async (job) => {
        const { queueId } = job.data;
        await prisma.$transaction(async (tx) => {
            const queue = await tx.queue.findUnique({
                where: {
                    id: queueId
                }
            })
            if (!queue) return
            await promoteIfAvailableSlot(tx, queueId, queue?.serviceSlots)
        })
    }
)