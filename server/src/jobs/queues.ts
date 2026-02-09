import type { Redis } from "ioredis";
import { Queue } from "bullmq";
import { getRedis } from "../infra/redis.js";

let redis: Redis | null = null
let lateExpiryQueue: Queue | null = null
let promoteIfFreeQueue: Queue | null = null

function getConnection(): Redis {
    if (!redis) {
        redis = getRedis();
    }
    return redis;
}
export function getLateExpiryQueue() {
    if (!lateExpiryQueue) {
        lateExpiryQueue = new Queue("late-expiry",
            {
                connection: getConnection(),
            }
        );
    }
    return lateExpiryQueue;

}


export function getPromoteIfFreeQueue() {
    if (!promoteIfFreeQueue) {
        promoteIfFreeQueue = new Queue("promote-if-free-slot",
            {
                connection: getConnection(),
            }
        )
    }
    return promoteIfFreeQueue
}





// new QueueScheduler("late-expiry", {
//   connection: redisConnection,
// });

// new QueueScheduler("promote-if-free-slot", {
//   connection: redisConnection,
// });