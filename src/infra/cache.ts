import { getRedis } from "./redis.js";
import { Queue, QueueUser } from "../../generated/prisma/client.js"

export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const redis = getRedis();
        const data = await redis.get(key);
        if (!data) return null;
        return JSON.parse(data) as T;
    } catch {
        return null;
    }
}

export async function cacheSet(key: string, value: any, ttlSeconds: number) {
    try {
        const redis = getRedis();
        await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {

    }
}

export async function cacheDel(pattern: string) {
    try {
        const redis = getRedis();
        const keys = await redis.keys(pattern);
        if (keys.length) await redis.del(keys);
    } catch {

    }
}

export async function cacheTTL(key: string) {
    try {
        const redis = getRedis();
        const ttl = await redis.pttl(key)
        if (ttl === -2) return null;       // key does not exist
        if (ttl === -1) return Infinity;   // key exists but no TTL
        return ttl;
    } catch {
        return null;
    }
}

//types for get
export type QueueWithCount = Queue & { count: number }
export type UserQueueTickets = QueueUser & { queue: { name: string } }
export type PaginatedQueueUsers = {
    users: UserQueueTickets[],
    paginated: {
        page: number,
        limit: number,
        total: number,
        totalPages: number
    }
}