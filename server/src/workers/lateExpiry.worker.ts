import { Worker } from "bullmq";
import { prisma } from "../infra/db.js";
import { QueueStatus } from "../../generated/prisma/enums.js";
import { transitionQueueUser } from "../core/queueUserStateMachine.js";
import { redisConnection } from "../infra/redis.js";
import { resolve } from "node:dns";

export const lateExpiryWorker = new Worker(
    "late-expiry",
    async (job) => {
        console.log("HANDLER HIT", job.id);
        const { queueId, userId } = job.data;
        await prisma.$transaction(async (tx) => {
            const qu = await tx.queueUser.findUnique({
                where: {
                    userId_queueId: {
                        userId,
                        queueId
                    }
                }
            })
            if (!qu) return;
            if (qu.status !== QueueStatus.LATE) return
            const now = new Date()
            if (!qu.expiresAt || qu.expiresAt > now) return

            const res = await transitionQueueUser(tx, userId, queueId, "MISSED", { actor: "system", now })
            console.log(res)
            if (!res) return
        })
    },
    {
        connection: redisConnection
    }
)

lateExpiryWorker.on("ready", () => {
    console.log("[late-expiry] worker ready");
});

lateExpiryWorker.on("active", (job) => {
    console.log("[late-expiry] active", job.id);
});

lateExpiryWorker.on("completed", (job) => {
    console.log("[late-expiry] completed", job.id);
});

lateExpiryWorker.on("failed", (job, err) => {
    console.error("[late-expiry] failed", job?.id, err);
});