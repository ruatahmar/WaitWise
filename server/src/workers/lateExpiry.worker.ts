import { Worker } from "bullmq";
import { prisma } from "../db/prisma.js";
import { QueueStatus } from "../../generated/prisma/enums.js";
import { transitionQueueUser } from "../core/queueUserStateMachine.js";
import { redisConnection } from "../infra/redis.js";

export const lateExpiryWorker = new Worker(
    "late-expiry",
    async (job) => {
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

            await transitionQueueUser(tx, userId, queueId, "MISSED", { actor: "system", now })

        })
    },
    {
        connection: redisConnection
    }
)