import { v4 as uuidv4 } from "uuid";
import ms from "ms";
import { prisma } from "../../infra/db.js";
import ApiError from "../../utils/apiError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Request, Response } from "express";
import ApiResponse from "../../utils/apiResponse.js";
import { QueueEventType, QueueStatus } from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { withTransaction } from "../../utils/transaction.js";
import { calculatePosition, transitionQueueUser } from "../../core/queueUserStateMachine.js";
import { logEvent } from "../../core/events.js";
import { io } from "../../index.js";

export async function promoteIfAvailableSlot(tx: Prisma.TransactionClient, queueId: number, serviceSlots: number): Promise<number[]> {
    const servingCount = await tx.queueUser.count({
        where: { queueId, status: QueueStatus.SERVING }
    });
    const openSlots = serviceSlots - servingCount;
    if (openSlots <= 0) return [];

    const candidates = await tx.queueUser.findMany({
        where: {
            queueId,
            status: QueueStatus.WAITING
        },
        orderBy: [
            { priorityBoost: "desc" },
            { joinedAt: "asc" }
        ],
        take: openSlots
    });
    if (candidates.length === 0) return [];
    const promotedIds: number[] = [];
    for (const candidate of candidates) {
        const res = await transitionQueueUser(tx, candidate.userId, queueId, "SERVE", { actor: "system" })
        if (res) promotedIds.push(res.queueUserId);
    }
    return promotedIds;
}

function emitPromotion(queueUserId: number) {
    io.to(`queueUser:${queueUserId}`).emit("queueUpdate", {
        status: QueueStatus.SERVING,
        position: 0,
        priorityBoost: 0,
    });
}

type TransitionResult = Awaited<ReturnType<typeof transitionQueueUser>>;

function emitQueueUpdate(transition: TransitionResult, promotedIds: number[]) {
    for (const id of promotedIds) emitPromotion(id);
    if (!promotedIds.includes(transition.queueUserId)) {
        io.to(`queueUser:${transition.queueUserId}`).emit("queueUpdate", {
            status: transition.to,
            position: transition.position,
            priorityBoost: transition.priorityBoost,
        });
    }
}

//CRUD
export const createQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user;
    const { name, maxSize, servingSlots, tokenTTL } = req.body;

    //invariant check
    if (maxSize != null && maxSize <= 0) {
        throw new ApiError(400, "maxSize must be > 0");
    }
    if (tokenTTL != null && tokenTTL < 0) {
        throw new ApiError(400, "turnExpiryMinutes must be > 0");
    }
    if (servingSlots != null && servingSlots < 0) {
        throw new ApiError(400, "servingSlots must be > 0");
    }
    const exist = await prisma.queue.findFirst({
        where: {
            adminId: userId,
            name: name
        }
    })
    if (exist) throw new ApiError(400, "Queue with name already created.")
    const newQueue = await prisma.queue.create({
        data: {
            name,
            adminId: userId,
            maxSize,
            serviceSlots: servingSlots,
            turnExpiryMinutes: tokenTTL
        }
    })

    return res.status(201).json(
        new ApiResponse(201, newQueue, "Queue created")
    )
});

export const getQueues = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const queues = await prisma.queue.findMany({
        where: {
            adminId: userId
        },
        orderBy: {
            createdAt: 'desc'
        }
    })
    return res.status(200)
        .json(
            new ApiResponse(200, queues, "Queues returned")
        )

});

export const getSpecificQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params
    const queue = await prisma.queue.findFirst({
        where: {
            id: Number(queueId),
            adminId: userId
        }
    })
    if (!queue) throw new ApiError(404, "Queue not found or you don't have permission");

    return res.status(200)
        .json(
            new ApiResponse(200, queue, "Queue retrieved")
        )
});

export const updateQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params
    const { name, maxSize, serviceSlots, tokenTTL } = req.body;

    const result = await withTransaction(async (tx) => {
        const updated = await tx.queue.updateMany({
            where: { id: Number(queueId), adminId: userId },
            data: {
                name,
                maxSize,
                serviceSlots,
                turnExpiryMinutes: tokenTTL
            }
        });

        if (updated.count === 0) throw new ApiError(404, "Queue does not exist");
        if (serviceSlots !== undefined && serviceSlots !== null) {
            const promoted = await promoteIfAvailableSlot(tx, Number(queueId), serviceSlots)
            return { updated, promoted }
        }

        return { updated, promoted: false }
    });

    return res.status(200).json(new ApiResponse(200, result, "Queue updated"));

});

export const deleteQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params
    const deleted = await prisma.queue.deleteMany({
        where: { id: Number(queueId), adminId: userId }
    });

    if (deleted.count === 0) throw new ApiError(404, "Queue not found");
    // (onDelete: Cascade)
    return res.status(200)
        .json(
            new ApiResponse(200, deleted, "Queue deleted")
        )
});

//User endpoints

export const joinQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params



    const { transition, promotedIds } = await withTransaction(async (tx): Promise<{ transition: TransitionResult, promotedIds: number[] }> => {
        //queue existance check
        const queue = await tx.queue.findUnique({
            where: { id: Number(queueId) }
        });
        if (!queue) throw new ApiError(404, "Queue not found");

        //maxSize check
        const activeCount = await tx.queueUser.count({
            where: {
                queueId: queue.id,
                status: { in: [QueueStatus.WAITING, QueueStatus.SERVING, QueueStatus.LATE] }
            }
        });
        if (queue.maxSize !== null && activeCount >= queue.maxSize) {
            throw new ApiError(400, "Queue full");
        }


        const existing = await tx.queueUser.findUnique({
            where: {
                userId_queueId: {
                    userId,
                    queueId: queue.id
                }
            }
        });
        let transition: TransitionResult;
        if (existing) {
            if (
                existing.status === QueueStatus.CANCELLED ||
                existing.status === QueueStatus.MISSED
            ) {
                transition = await transitionQueueUser(
                    tx,
                    userId,
                    queue.id,
                    "REJOIN",
                    { actor: "user" }
                );
                // io.to(`queueUser:${result.queueUserId}`).emit("queueUpdate", {
                //     status: result.to,
                //     position: result.position,
                // });
            } else {
                throw new ApiError(400, "Already in queue");
            }
        } else {
            // Fresh join
            const created = await tx.queueUser.create({
                data: {
                    queueId: queue.id,
                    userId,
                    token: uuidv4(),
                    status: QueueStatus.WAITING,
                },
            });
            const position = await calculatePosition(tx, created.queueId, created.joinedAt, created.priorityBoost)
            await logEvent(
                tx,
                Number(queueId),
                QueueEventType.QUEUEUSER_CREATED,
                {
                    actor: "user",
                    to: QueueStatus.WAITING
                },
                created.id
            );
            transition = {
                queueUserId: created.id,
                from: QueueStatus.WAITING,
                to: QueueStatus.WAITING,
                position,
                priorityBoost: 0,
            } as TransitionResult;
        }
        const promotedIds = await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)

        return { transition, promotedIds };
    });
    emitQueueUpdate(transition, promotedIds)
    return res.status(201).json(new ApiResponse(201, transition, "Joined queue"));
});

export const leaveQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params

    const { transition, promotedIds } = await withTransaction(async (tx) => {
        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist")

        const transition = await transitionQueueUser(tx, Number(userId), Number(queueId), "LEAVE", { actor: "user" });
        const freedSlot = transition.from === QueueStatus.SERVING
        //prevents extra db work
        let promotedIds: number[] = []
        if (freedSlot) {
            promotedIds = await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)
        }
        return { transition, promotedIds }
    })
    emitQueueUpdate(transition, promotedIds)
    console.log("entered")
    return res.status(200)
        .json(
            new ApiResponse(200, transition, "Status updated")
        )
});

export const lateRejoin = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params
    const { transition, promotedIds } = await withTransaction(async (tx) => {
        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist")
        const transition = await transitionQueueUser(tx, userId, Number(queueId), "REJOIN", { actor: "user" })
        const promotedIds = await promoteIfAvailableSlot(tx, Number(queueId), queue.serviceSlots)
        return { transition, promotedIds }
    });
    emitQueueUpdate(transition, promotedIds)
    const message = transition.to === QueueStatus.WAITING ? "Successfully rejoined" : "Late please rejoin"
    return res.status(200)
        .json(
            new ApiResponse(200, transition, message)
        )

});

export const getQueueStatus = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params
    const result = await withTransaction(async (tx) => {
        const ticket = await tx.queueUser.findUnique({
            where: {
                userId_queueId: {
                    userId,
                    queueId: Number(queueId)
                }
            },
            select: {
                status: true,
                token: true,
                servedAt: true,
                expiresAt: true,
                priorityBoost: true,
                joinedAt: true,
                queue: {
                    select: {
                        name: true,
                        serviceSlots: true,
                        turnExpiryMinutes: true
                    }
                },
            },
        })
        if (!ticket) throw new ApiError(404, "You are not in this queue.");
        if (ticket.status !== QueueStatus.WAITING) {
            return { ...ticket, position: null }
        }
        const position = await calculatePosition(tx, Number(queueId), ticket.joinedAt, ticket.priorityBoost)
        return { ...ticket, position }

    })
    return res.status(200)
        .json(
            new ApiResponse(200, result, "Queue Status Returned")
        )
});

export const getAllQueueTickets = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const result = await prisma.$transaction(async (tx) => {
        const queues = await tx.queueUser.findMany({
            where: {
                userId: userId,
            },
            include: {
                queue: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                updatedAt: "desc"
            }
        })
        return queues
    })
    return res.status(200)
        .json(
            new ApiResponse(200, result, "All tickets returned")
        )
});

//Admin endpoints

export const markComplete = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId, targetUserId } = req.params

    const { transition, promotedIds } = await withTransaction(async (tx) => {

        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
                adminId: userId
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist");
        const transition = await transitionQueueUser(tx, Number(targetUserId), Number(queueId), "COMPLETE", { actor: "admin" });
        const promotedIds = await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)
        return { transition, promotedIds };
    })
    emitQueueUpdate(transition, promotedIds)
    return res.status(200)
        .json(
            new ApiResponse(200, transition, "Status updated.")
        )

});

export const markLate = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId, targetUserId } = req.params


    const { transition, promotedIds } = await withTransaction(async (tx) => {

        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
                adminId: userId
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist");
        const transition = await transitionQueueUser(tx, Number(targetUserId), Number(queueId), "MARK_LATE", { actor: "admin" });

        const promotedIds = await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)

        return { transition, promotedIds }
    })
    emitQueueUpdate(transition, promotedIds)
    return res.status(200)
        .json(
            new ApiResponse(200, transition, "Status updated.")
        )
});

export const removeQueueUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId, targetUserId } = req.params

    const { transition, promotedIds } = await withTransaction(async (tx) => {

        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
                adminId: userId
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist")
        const transition = await transitionQueueUser(tx, Number(targetUserId), Number(queueId), "LEAVE", { actor: "admin" });
        //prevents extra db work
        let promotedIds: number[] = [];
        if (transition.from === QueueStatus.SERVING) {
            promotedIds = await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)
        }
        return { transition, promotedIds };
    })
    emitQueueUpdate(transition, promotedIds)
    return res.status(200)
        .json(
            new ApiResponse(200, transition, "Status updated")
        )
});



