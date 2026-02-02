
import { Queue } from "bullmq";
import { redisConnection } from "../infra/redis.js";


export const lateExpiryQueue = new Queue("late-expiry", {
    connection: redisConnection,
});

export const promoteIfFreeQueue = new Queue("promote-if-free-slot", {
    connection: redisConnection,
})




// new QueueScheduler("late-expiry", {
//   connection: redisConnection,
// });

// new QueueScheduler("promote-if-free-slot", {
//   connection: redisConnection,
// });