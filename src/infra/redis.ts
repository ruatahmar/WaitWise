import { Redis } from "ioredis";
import "dotenv/config"
import { startWorkers } from "../workers/start.js";

let redisConnection: Redis | null = null;



export function getRedis(): Redis {
    if (!redisConnection) {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            console.error("REDIS_URL not set — caching disabled");
            return null as any;
        }
        redisConnection = new Redis(redisUrl, {
            maxRetriesPerRequest: null,
            lazyConnect: true,
            enableReadyCheck: false,
            enableOfflineQueue: false,
            connectTimeout: 1000,
            retryStrategy: () => null,
            reconnectOnError: () => false,
        });

        // Suppress connection errors
        redisConnection.on('error', (err) => {
            console.error("Redis connection error:", err.message);
        });
        redisConnection.on('connect', () => {
            console.log("Redis connected");
        });

        startWorkers()
    }
    return redisConnection;
}