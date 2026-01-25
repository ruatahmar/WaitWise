import { Router } from "express";
import { createQueue, deleteQueue, getQueues, getQueueStatus, getSpecificQueue, joinQueue, updateQueue } from "../../controllers/v1/queues.controller.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";

const app = Router()

app.get("/", jwtAuth, getQueues)
app.get("/:queueId", jwtAuth, getSpecificQueue)
app.post("/create", jwtAuth, createQueue)
app.put("/:queueId", jwtAuth, updateQueue)
app.delete("/:queueId", jwtAuth, deleteQueue)

app.post("/:queueId/join", jwtAuth, joinQueue)
app.get("/:queueId/status", jwtAuth, getQueueStatus)

export default app;