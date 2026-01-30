//background jobs
import "../infra/redis.js"
import "./promoteIfFreeSlot.worker.js"
import "./lateExpiry.worker.js";
import { startLateExpirySafetyNet } from "./lateExpirySafetyNet.worker.js";

startLateExpirySafetyNet()
console.log("Workers Booted")