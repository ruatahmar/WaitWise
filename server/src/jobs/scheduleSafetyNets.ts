import { lateExpirySafetyNetQueue } from "./queues.js";

export async function scheduleLateExpirySafetyNet() {
    await lateExpirySafetyNetQueue.add(
        "scan-late-expired-users",
        {},
        {
            repeat: {
                every: 2 * 60 * 1000 // every 2 minutes
            },
            removeOnComplete: true
        }
    );
}