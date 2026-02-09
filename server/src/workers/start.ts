//background jobs
import startLateExpiryWorker from "./lateExpiry.worker.js";
import startPromoteIfFreeSlotWorker from "./promoteIfFreeSlot.worker.js";
import { startLateExpirySafetyNet } from "./lateExpirySafetyNet.worker.js";

try {
    startLateExpiryWorker()

    startPromoteIfFreeSlotWorker()
} catch (error) {
    console.trace(error)
}

startLateExpirySafetyNet()
console.log("Workers Booted")