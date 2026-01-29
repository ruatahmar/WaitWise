
import { Queue } from "bullmq";
import { redisConnection } from "../infra/redis.js";

export const lateExpiryQueue = new Queue("late-expiry", {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: "exponential", //this means retries delay inscrease exponentially 
            delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});

export const promoteIfFreeQueue = new Queue("promote-if-free-slot", {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: "exponential",
            delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
})

export const lateExpirySafetyNetQueue = new Queue("late-expiry-safety-net", {
    connection: redisConnection,
}
);