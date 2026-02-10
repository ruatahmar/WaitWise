import { Redis } from "ioredis";
import ApiError from "../utils/apiError.js";

let redisConnection: Redis | null = null;

export function getRedis(): Redis {
    if (!redisConnection) {
        redisConnection = new Redis({
            host: "127.0.0.1",
            port: 6379,
            maxRetriesPerRequest: null,
            lazyConnect: true,
            enableReadyCheck: false,
            enableOfflineQueue: false,
            retryStrategy: () => null,
            reconnectOnError: () => false,
        });

        // Suppress connection errors
        redisConnection.on('error', (err) => {
            throw new ApiError(503, "Queue system unavailable");
        });
    }
    return redisConnection;
}