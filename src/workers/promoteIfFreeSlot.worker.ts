import { Worker } from "bullmq";
import { prisma } from "../infra/db.js";
import { triggerPromotion } from "../controllers/v1/queues.controller.js";

import { getRedis } from "../infra/redis.js";


export default function startPromoteIfFreeSlotWorker() {
    const redisConnection = getRedis();

    const promoteIfFreeSlotWorker = new Worker(
        "promote-if-free-slot",
        async (job) => {
            const { queueId } = job.data;
            if (!queueId) return
            try {
                await triggerPromotion(queueId)

            } catch (error) {
                console.error("[promote-if-free-slot] promotion error. QueueId:", queueId, error);
                throw error;
            }

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
