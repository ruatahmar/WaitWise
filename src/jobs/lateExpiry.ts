import { getLateExpiryQueue } from "./queues.js"
import ApiError from "../utils/apiError.js"


type CheckLateExpiryPayload = {
    userId: number,
    queueId: number
}

export async function enqueueCheckLateExpiry(
    payload: CheckLateExpiryPayload,
    delayMs: number
) {
    try {
        const queue = getLateExpiryQueue()
        await queue.add(
            "check-late-expiry",
            payload,
            {
                attempts: 5,
                backoff: {
                    type: "exponential", //this means retries delay inscrease exponentially
                    delay: 5000
                },
                removeOnComplete: true,
                removeOnFail: false,
                delay: delayMs,
                jobId: `late-expiry-${payload.queueId}-${payload.userId}`
            }
        )
        console.log("Enqueue checkLateExpiry", payload, delayMs)
        return true
    } catch (error) {
        console.error("Redis enqueue failed", error);
        return false;

    }

}