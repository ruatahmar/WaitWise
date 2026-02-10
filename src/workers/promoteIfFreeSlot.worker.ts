import { Worker } from "bullmq";
import { prisma } from "../infra/db.js";
import { promoteIfAvailableSlot } from "../controllers/v1/queues.controller.js";

import { getRedis } from "../infra/redis.js";


export default function startPromoteIfFreeSlotWorker() {
    const redisConnection = getRedis();

    const promoteIfFreeSlotWorker = new Worker(
        "promote-if-free-slot",
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
        },
        {
            connection: redisConnection
        }
    )

    promoteIfFreeSlotWorker.on("ready", () => {
        console.log("[promote-if-free-slot] worker ready");
    });

    promoteIfFreeSlotWorker.on("active", (job) => {
        console.log("[promote-if-free-slot] active. QueueId: ", job.data.queueId);
    });

    promoteIfFreeSlotWorker.on("completed", (job) => {
        console.log("[promote-if-free-slot] promotion completed. QueueId: ", job.data.queueId);
    });

    promoteIfFreeSlotWorker.on("failed", (job, err) => {
        console.error("[promote-if-free-slot] failed. QueueId:", job?.data.queueId, err);
    });
    return promoteIfFreeSlotWorker
}
