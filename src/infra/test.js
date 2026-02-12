// inspectRedis.js
import { Redis } from "ioredis";

const REDIS_URL = "rediss://red-d66g4bp4tr6s73al6seg:BZKce0GrfO4ktATT8L4Qidj1ju7QdjjM@singapore-keyvalue.render.com:6379";
const redis = new Redis(REDIS_URL);

async function main() {
    let cursor = 0;
    console.log("Fetching all keys...");
    do {
        const [nextCursor, keys] = await redis.scan(cursor, "COUNT", 100);
        cursor = Number(nextCursor);
        for (const key of keys) {
            console.log(key);
        }
    } while (cursor !== 0);
    redis.disconnect();
}

main();
