
import { Queue } from "bullmq";
import { redisConnection } from "../infra/redis.js";
import { QueueStatus } from "../../generated/prisma/enums.js";
import { prisma } from "../db/prisma.js";
import { enqueueCheckLateExpiry } from "./lateExpiry.js";


export const lateExpiryQueue = new Queue("late-expiry", {
    connection: redisConnection,
});

export const promoteIfFreeQueue = new Queue("promote-if-free-slot", {
    connection: redisConnection,
})

setInterval(async () => {
    const now = new Date()
    const lateUsers = await prisma.queueUser.findMany({
        where: {
            status: QueueStatus.LATE,
            expiresAt: {
                lte: now, //less than or equal 
            },
        }
    });
    for (const qu of lateUsers) {
        if (!qu.expiresAt || qu.expiresAt > now) continue
        await enqueueCheckLateExpiry({ userId: qu.userId, queueId: qu.queueId }, 0);
        console.log(`Safety net enqueued late-expiry job for ${qu.userId}`);
    }
}, 30_000);



// new QueueScheduler("late-expiry", {
//   connection: redisConnection,
// });

// new QueueScheduler("promote-if-free-slot", {
//   connection: redisConnection,
// });