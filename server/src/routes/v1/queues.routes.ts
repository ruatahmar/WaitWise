import { Router } from "express";
import { createQueue, deleteQueue, getQueues, getQueueStatus, getSpecificQueue, joinQueue, leaveQueue, markComplete, markLate, updateQueue } from "../../controllers/v1/queues.controller.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";

const app = Router()

app.get("/", jwtAuth, getQueues)
app.get("/:queueId", jwtAuth, getSpecificQueue)
app.post("/create", jwtAuth, createQueue)
app.put("/:queueId", jwtAuth, updateQueue)
app.delete("/:queueId", jwtAuth, deleteQueue)

app.post("/:queueId/join", jwtAuth, joinQueue)
app.post("/:queueId/serving/complete", jwtAuth, markComplete)
app.post("/:queueId/serving/late", jwtAuth, markLate)
// POST /queues/{id}/late/{queueUserId}/rejoin
app.post("/:queueId/leave", jwtAuth, leaveQueue)
app.get("/:queueId/status", jwtAuth, getQueueStatus)

export default app;