import ApiError from "../utils/apiError.js";
import { getPromoteIfFreeQueue } from "./queues.js";


type promoteIfFreePayload = {
    queueId: number
}

export async function enqueuePromoteIfFree(
    payload: promoteIfFreePayload,
) {
    try {
        const queue = getPromoteIfFreeQueue()
        await queue.add(
            "promote-if-free-slot",
            payload,
            {
                attempts: 5,
                backoff: {
                    type: "exponential",
                    delay: 5000
                },
                removeOnComplete: true,
                removeOnFail: false,
                jobId: `promote-if-free-slot-${payload.queueId}`
            }
        )
        console.log("Enqueue promoteIfFreeSlot", payload)
        return true;
    } catch (error) {
        console.error("Redis enqueue failed", error);
        return false;
    }
}