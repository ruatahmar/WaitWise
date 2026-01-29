import { lateExpiryQueue } from "./queues.js"

type CheckLateExpiryPayload = {
    userId: number,
    queueId: number
}

export async function enqueueCheckLateExpiry(
    payload: CheckLateExpiryPayload,
    delayMs: number
) {
    await lateExpiryQueue.add(
        "check-late-expiry",
        payload,
        {
            delay: delayMs,
            jobId: `late-expiry:${payload.queueId}:${payload.userId}`
        }
    )
    console.log("Enqueue checkLateExpiry", payload, delayMs)
}

