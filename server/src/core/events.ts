import { Prisma, QueueEventType } from "../../generated/prisma/client.js";

export async function logEvent(
    tx: Prisma.TransactionClient,
    queueId: number,
    type: QueueEventType,
    payload: Prisma.InputJsonValue,
    queueUserId?: number,
) {
    await tx.queueEvents.create({
        data: {
            queueId,
            type,
            payload,
            queueUserId
        }
    })
    console.log("Event logged: ", type)
}