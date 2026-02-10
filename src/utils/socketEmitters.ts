import { QueueStatus } from "../../generated/prisma/enums.js";
import { io } from "../index.js";
import { QueueUserTransitionResult } from "../core/queueUserStateMachine.js";
import { prisma } from "../infra/db.js";

export function emitPromotion(queueUserId: number) {
    io.to(`queueUser:${queueUserId}`).emit("userStatusUpdate", {
        status: QueueStatus.SERVING,
        position: 0,
        priorityBoost: 0,
        expiresAt: 0
    });
}

export function emitUserStatusUpdate(transition: QueueUserTransitionResult) {
    io.to(`queueUser:${transition.queueUserId}`).emit("userStatusUpdate", {
        status: transition.to,
        position: transition.position,
        priorityBoost: transition.priorityBoost,
        expiresAt: transition.expiresAt
    });
}


export async function emitQueueUpdate(queueId: number) {
    //this query is happening out of the transaction in the controller for the sake of CQRS
    const users = await prisma.queueUser.findMany({
        where: {
            queueId,
        },
        orderBy: [
            { priorityBoost: "desc" },
            { joinedAt: "asc" }
        ],
        include: {
            user: {
                select: {
                    name: true
                }
            }
        }
    })
    io.to(`queue:${queueId}`).emit("queueUpdate", {
        users
    })
    console.log(`emitted to ${queueId}`)
}
