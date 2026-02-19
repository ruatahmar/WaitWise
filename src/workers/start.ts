//background jobs
import startLateExpiryWorker from "./lateExpiry.worker.js";
import startPromoteIfFreeSlotWorker from "./promoteIfFreeSlot.worker.js";
import { startLateExpirySafetyNet } from "./lateExpirySafetyNet.worker.js";

export function startWorkers() {
    startLateExpiryWorker()
    startPromoteIfFreeSlotWorker()
    startLateExpirySafetyNet()
    console.log("Workers started")
}

