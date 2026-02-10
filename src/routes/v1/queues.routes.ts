import { Router } from "express";
import { createQueue, deleteQueue, getAllQueueTickets, getQueues, getQueueStatus, getQueueUsersPaginated, getSpecificQueue, joinQueue, lateArrived, lateRejoin, leaveQueue, markComplete, markLate, removeQueueUser, updateQueue } from "../../controllers/v1/queues.controller.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";

const app = Router()

//CRUD endpoints
app.get("/", jwtAuth, getQueues)
app.post("/", jwtAuth, createQueue)
app.get("/tickets", jwtAuth, getAllQueueTickets);
app.get("/:queueId", jwtAuth, getSpecificQueue)
app.put("/:queueId", jwtAuth, updateQueue)
app.delete("/:queueId", jwtAuth, deleteQueue)

//User endpoints
app.post("/:queueId/join", jwtAuth, joinQueue)
app.post("/:queueId/leave", jwtAuth, leaveQueue)
app.get("/:queueId/status", jwtAuth, getQueueStatus)
app.post("/:queueId/rejoin", jwtAuth, lateRejoin)

//Admin endpoints
app.post("/:queueId/users/:targetUserId/complete", jwtAuth, markComplete)
app.post("/:queueId/users/:targetUserId/late", jwtAuth, markLate)
app.post("/:queueId/users/:targetUserId/remove", jwtAuth, removeQueueUser)
app.post("/:queueId/users/:targetUserId/arrived", jwtAuth, lateArrived)
app.get("/:queueId/users", jwtAuth, getQueueUsersPaginated); //?page=

export default app;