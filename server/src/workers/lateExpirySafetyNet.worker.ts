import { QueueStatus } from "../../generated/prisma/enums.js";
import { transitionQueueUser } from "../core/queueUserStateMachine.js";
import { prisma } from "../db/prisma.js";
import { Worker } from "bullmq";
import { redisConnection } from "../infra/redis.js";

export const lateExpirySafetyNetWorker = new Worker(
    "late-expiry-safety-net",
    async () => {
        const now = new Date()
        await prisma.$transaction(async (tx) => {
            const queueUsers = await tx.queueUser.findMany({
                where: {
                    status: QueueStatus.LATE,
                    expiresAt: {
                        lte: now, //less than or equal 
                    },
                }
            })
            for (const queueUser of queueUsers) {
                if (!queueUser.expiresAt || queueUser.expiresAt > now) continue
                await transitionQueueUser(tx, queueUser.userId, queueUser.queueId, "MISSED", { actor: "system", now })
            }
        })
    },
    {
        connection: redisConnection
    }
);