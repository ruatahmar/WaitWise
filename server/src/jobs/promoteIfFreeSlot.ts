import { promoteIfFreeQueue } from "./queues.js"

type promoteIfFreePayload = {
    queueId: number
}

export async function enqueuePromoteIfFree(
    payload: promoteIfFreePayload,
) {
    await promoteIfFreeQueue.add(
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
}