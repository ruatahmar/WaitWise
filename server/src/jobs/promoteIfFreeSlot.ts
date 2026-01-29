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
            jobId: `promote-if-free-slot:${payload.queueId}`
        }
    )
    console.log("Enqueue promoteIfFreeSlot", payload)
}