import { v4 as uuidv4 } from "uuid";
import ms from "ms";
import { prisma } from "../../infra/db.js";
import ApiError from "../../utils/apiError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Request, Response } from "express";
import ApiResponse from "../../utils/apiResponse.js";
import { QueueStatus } from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { withTransaction } from "../../utils/transaction.js";
import { transitionQueueUser } from "../../core/queueUserStateMachine.js";

export async function promoteIfAvailableSlot(tx: Prisma.TransactionClient, queueId: number, serviceSlots: number): Promise<number> {
    const servingCount = await tx.queueUser.count({
        where: { queueId, status: QueueStatus.SERVING }
    });
    const openSlots = serviceSlots - servingCount;
    if (openSlots <= 0) return 0;

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
    if (candidates.length === 0) return 0;
    let promoted = 0;
    for (const candidate of candidates) {
        const res = await transitionQueueUser(tx, candidate.userId, queueId, "SERVE", { actor: "system" })
        if (res) {
            promoted++;
        }

    }
    return promoted;
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

    const result = await withTransaction(async (tx) => {
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
        if (existing) {
            if (
                existing.status === QueueStatus.CANCELLED ||
                existing.status === QueueStatus.MISSED
            ) {
                await transitionQueueUser(
                    tx,
                    userId,
                    queue.id,
                    "REJOIN",
                    { actor: "user" }
                );
            } else {
                throw new ApiError(400, "Already in queue");
            }
        } else {
            // Fresh join
            await tx.queueUser.create({
                data: {
                    queueId: queue.id,
                    userId,
                    token: uuidv4(),
                    status: QueueStatus.WAITING,
                },
            });
        }
        await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)

        return;
    });

    return res.status(201).json(new ApiResponse(201, result, "Joined queue"));
});

export const leaveQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params

    const result = await withTransaction(async (tx) => {
        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist")

        const transition = await transitionQueueUser(tx, Number(userId), Number(queueId), "LEAVE", { actor: "user" });
        const freedSlot = transition.from === QueueStatus.SERVING
        //prevents extra db work
        if (freedSlot) {
            await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)
        }
        return transition
    })

    return res.status(200)
        .json(
            new ApiResponse(200, result, "Status updated")
        )
});

export const lateRejoin = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params
    const rejoinStatus = await withTransaction(async (tx) => {
        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist")
        const transition = await transitionQueueUser(tx, userId, Number(queueId), "REJOIN", { actor: "user" })
        await promoteIfAvailableSlot(tx, Number(queueId), queue.serviceSlots)
        return true
    });
    const message = rejoinStatus ? "Successfully rejoined" : "Late please rejoin"
    return res.status(200)
        .json(
            new ApiResponse(200, {}, message)
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
        const position = await tx.queueUser.count({
            where: {
                queueId: Number(queueId),
                status: QueueStatus.WAITING,
                OR: [
                    { priorityBoost: { gt: ticket.priorityBoost } },
                    {
                        priorityBoost: ticket.priorityBoost,
                        joinedAt: { lt: ticket.joinedAt }
                    }
                ]
            }
        }) + 1;
        return { ...ticket, position }

    })
    return res.status(200)
        .json(
            new ApiResponse(200, result, "Queue Status Returned")
        )
});

//Admin endpoints

export const markComplete = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId, targetUserId } = req.params

    const result = await withTransaction(async (tx) => {

        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
                adminId: userId
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist");
        const transition = await transitionQueueUser(tx, Number(targetUserId), Number(queueId), "COMPLETE", { actor: "admin" });
        await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)
        return transition;
    })

    return res.status(200)
        .json(
            new ApiResponse(200, result, "Status updated.")
        )

});

export const markLate = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId, targetUserId } = req.params


    const result = await withTransaction(async (tx) => {

        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
                adminId: userId
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist");
        const transition = await transitionQueueUser(tx, Number(targetUserId), Number(queueId), "MARK_LATE", { actor: "admin" });
        await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)
        return transition
    })

    return res.status(200)
        .json(
            new ApiResponse(200, result, "Status updated.")
        )
});

export const removeQueueUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId, targetUserId } = req.params

    const result = await withTransaction(async (tx) => {

        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
                adminId: userId
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist")
        const transition = await transitionQueueUser(tx, Number(targetUserId), Number(queueId), "LEAVE", { actor: "admin" });
        //prevents extra db work
        const freedSlot = transition.from === QueueStatus.SERVING
        if (freedSlot) {
            await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)
        }
        return transition
    })

    return res.status(200)
        .json(
            new ApiResponse(200, result, "Status updated")
        )
});



