import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../infra/db.js";
import ApiError from "../../utils/apiError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Request, Response } from "express";
import ApiResponse from "../../utils/apiResponse.js";
import { QueueEventType, QueueStatus } from "../../../generated/prisma/enums.js";
import { Prisma, Queue } from "../../../generated/prisma/client.js";
import { withTransaction } from "../../utils/transaction.js";
import { calculatePosition, QueueUserTransitionResult, transitionQueueUser } from "../../core/queueUserStateMachine.js";
import { logEvent } from "../../core/events.js";
import { emitPromotion, emitQueueUpdate, emitUserStatusUpdate } from "../../utils/socketEmitters.js";

export async function triggerPromotion(queueId: number): Promise<number[]> {
    const result = await withTransaction(async (tx) => {
        await tx.$queryRaw`
            SELECT id FROM "Queue"
            WHERE id = ${queueId}
            FOR UPDATE
        `;
        const promotedIds: number[] = [];
        const queue = await tx.queue.findUnique({
            where: { id: queueId }
        })
        if (!queue) return []
        const settings = getEffectiveQueueSettings(queue)
        while (true) {

            const servingCount = await tx.queueUser.count({
                where: { queueId, status: QueueStatus.SERVING }
            });
            const openSlots = settings.serviceSlots - servingCount;
            if (openSlots <= 0) break;
            const candidate = await tx.queueUser.findFirst({
                where: {
                    queueId,
                    status: QueueStatus.WAITING
                },
                orderBy: [
                    { priorityBoost: "desc" },
                    { joinedAt: "asc" }
                ],
            });
            if (!candidate) break;
            const res = await transitionQueueUser(tx, candidate.userId, queueId, "SERVE", { actor: "system" })
            if (!res) break;
            promotedIds.push(res.queueUserId);
        }
        return promotedIds;
    })
    for (const id of result) {
        emitPromotion(id)
        await emitQueueUpdate(queueId)
    }
    return result;
}

async function countActiveQueueUsers(tx: Prisma.TransactionClient, queueId: number) {
    const count = await tx.queueUser.count({
        where: {
            queueId,
            status: {
                in: [
                    QueueStatus.WAITING,
                    QueueStatus.LATE,
                ]
            }
        }
    })
    return count;
}

function optionalPositiveNumber(value: any): number | undefined {
    if (value == null) return undefined;
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) return undefined;
    return num;
}

function getEffectiveQueueSettings(queue: Queue) {
    return {
        serviceSlots: queue.serviceSlots ?? 1,
        graceTime: queue.graceTime ?? 5,
        maxSize: queue.maxSize ?? null
    };
}

//CRUD
export const createQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user;
    const { name, maxSize = null, serviceSlots = null, graceTime } = req.body;

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
            // adminId: userId,
            maxSize: optionalPositiveNumber(maxSize),
            serviceSlots: optionalPositiveNumber(serviceSlots),
            graceTime: optionalPositiveNumber(graceTime),
            admin: {
                connect: { id: userId }
            }
        }
    })


    return res.status(201).json(
        new ApiResponse(201, newQueue, "Queue created")
    )
});

export const getQueues = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const result = await withTransaction(async (tx) => {
        const queues = await tx.queue.findMany({
            where: {
                adminId: userId
            },
            orderBy: {
                updatedAt: 'desc'
            }
        })
        const queuesWithCount = await Promise.all(
            queues.map(async (queue) => {
                const count = await countActiveQueueUsers(tx, queue.id)
                return { ...queue, count }
            })
        )
        return queuesWithCount
    })

    return res.status(200)
        .json(
            new ApiResponse(200, result, "Queues returned")
        )
});

export const getSpecificQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params
    const result = await withTransaction(async (tx) => {
        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
                adminId: userId
            }
        })
        if (!queue) throw new ApiError(404, "Queue not found or you don't have permission");
        const count = await countActiveQueueUsers(tx, queue.id)
        return { ...queue, count }
    })

    return res.status(200)
        .json(
            new ApiResponse(200, result, "Queue retrieved")
        )
});

export const updateQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params
    const { name, maxSize, serviceSlots, graceTime } = req.body;

    const result = await withTransaction(async (tx) => {
        const updated = await tx.queue.update({
            where: { id: Number(queueId), adminId: userId },
            data: {
                name,
                maxSize: optionalPositiveNumber(maxSize),
                serviceSlots: optionalPositiveNumber(serviceSlots),
                graceTime: optionalPositiveNumber(graceTime),
            }
        });
        return updated
    });
    await triggerPromotion(Number(queueId))
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

    const transition = await withTransaction(async (tx): Promise<QueueUserTransitionResult> => {
        //queue existance check
        const queue = await tx.queue.findUnique({
            where: { id: Number(queueId) }
        });
        if (!queue) throw new ApiError(404, "Queue not found");
        const settings = getEffectiveQueueSettings(queue)
        //maxSize check
        const activeCount = await tx.queueUser.count({
            where: {
                queueId: queue.id,
                status: { in: [QueueStatus.WAITING, QueueStatus.SERVING, QueueStatus.LATE] }
            }
        });
        if (settings.maxSize != null && activeCount >= settings.maxSize) {
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
        let transition: QueueUserTransitionResult;
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
                position: Number(position),
                priorityBoost: 0,
            } as QueueUserTransitionResult;
        }
        return transition;
    });
    triggerPromotion(Number(queueId))
    emitUserStatusUpdate(transition)
    await emitQueueUpdate(Number(queueId))
    return res.status(201).json(new ApiResponse(201, transition, "Joined queue"));
});

export const leaveQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params

    const transition = await withTransaction(async (tx) => {
        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist")

        const transition = await transitionQueueUser(tx, Number(userId), Number(queueId), "LEAVE", { actor: "user" });
        // const freedSlot = transition.from === QueueStatus.SERVING
        // //prevents extra db work
        // let promotedIds: number[] = []
        // if (freedSlot) {
        //     promotedIds = await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)
        // }
        return transition
    })
    triggerPromotion(Number(queueId))
    emitUserStatusUpdate(transition)
    await emitQueueUpdate(Number(queueId))
    console.log("entered")
    return res.status(200)
        .json(
            new ApiResponse(200, transition, "Status updated")
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
                        graceTime: true,
                        maxSize: true
                    }
                },
            },
        })
        if (!ticket) throw new ApiError(404, "You are not in this queue.");
        if (ticket.status !== QueueStatus.WAITING) {
            return { ...ticket, position: null }
        }
        const position = await calculatePosition(tx, Number(queueId), ticket.joinedAt, ticket.priorityBoost)
        console.log(position)
        const count = await countActiveQueueUsers(tx, Number(queueId))
        return { ...ticket, position, count }

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

export const lateRejoin = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params
    const transition = await withTransaction(async (tx) => {
        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist")
        const transition = await transitionQueueUser(tx, userId, Number(queueId), "REJOIN", { actor: "user" })

        return transition
    });
    triggerPromotion(Number(queueId))
    emitUserStatusUpdate(transition)
    await emitQueueUpdate(Number(queueId))
    const message = transition.to === QueueStatus.WAITING ? "Successfully rejoined" : "Late please rejoin"
    return res.status(200)
        .json(
            new ApiResponse(200, transition, message)
        )

});
//Admin endpoints

export const markComplete = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId, targetUserId } = req.params

    const transition = await withTransaction(async (tx) => {

        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
                adminId: userId
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist");
        const transition = await transitionQueueUser(tx, Number(targetUserId), Number(queueId), "COMPLETE", { actor: "admin" });
        // const promotedIds = await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)
        return transition//{ , promotedIds };
    })
    triggerPromotion(Number(queueId))
    emitUserStatusUpdate(transition)
    await emitQueueUpdate(Number(queueId))
    return res.status(200)
        .json(
            new ApiResponse(200, transition, "Status updated.")
        )

});

export const markLate = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId, targetUserId } = req.params


    const transition = await withTransaction(async (tx) => {

        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
                adminId: userId
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist");
        const transition = await transitionQueueUser(tx, Number(targetUserId), Number(queueId), "MARK_LATE", { actor: "admin" });

        // const promotedIds = await promoteIfAvailableSlot(tx, queue.id, queue.serviceSlots)

        return transition//{ , promotedIds }
    })
    triggerPromotion(Number(queueId))
    emitUserStatusUpdate(transition)
    await emitQueueUpdate(Number(queueId))
    return res.status(200)
        .json(
            new ApiResponse(200, transition, "Status updated.")
        )
});

export const removeQueueUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId, targetUserId } = req.params

    const transition = await withTransaction(async (tx) => {

        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
                adminId: userId
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist")
        const transition = await transitionQueueUser(tx, Number(targetUserId), Number(queueId), "LEAVE", { actor: "admin" });
        //prevents extra db work
        return transition
    })

    triggerPromotion(Number(queueId))

    emitUserStatusUpdate(transition)
    await emitQueueUpdate(Number(queueId))
    return res.status(200)
        .json(
            new ApiResponse(200, transition, "Status updated")
        )
});

export const getQueueUsersPaginated = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params
    const { page = "0" } = req.query

    const pageNum = Math.max(0, Number(page) || 0);
    const limit = 10;

    const { users, total } = await withTransaction(async (tx) => {
        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
                adminId: userId
            }
        });

        if (!queue) throw new ApiError(403, "Not authorized");
        const users = await tx.queueUser.findMany({
            where: {
                queueId: Number(queueId),
                // status: {
                //     in: [
                //         QueueStatus.SERVING,
                //         QueueStatus.WAITING,
                //         QueueStatus.LATE
                //     ]
                // }
            },
            include: {
                user: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: [
                { priorityBoost: "desc" },
                { joinedAt: "asc" }
            ],
            skip: pageNum * limit,
            take: limit

        })
        const total = await tx.queueUser.count({
            where: {
                queueId: Number(queueId),
            }
        })
        return { users, total }
    })
    const result = {
        users,
        paginated: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)

        }
    }
    return res.status(200).json(
        new ApiResponse(200, result, "Data fetched")
    )

});

export const lateArrived = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId, targetUserId } = req.params
    const transition = await withTransaction(async (tx) => {
        const queue = await tx.queue.findFirst({
            where: {
                id: Number(queueId),
                adminId: userId
            }
        })
        if (!queue) throw new ApiError(404, "Queue does not exist")
        const transition = await transitionQueueUser(tx, Number(targetUserId), Number(queueId), "REJOIN", { actor: "user" })
        // const promotedIds = await promoteIfAvailableSlot(tx, Number(queueId), queue.serviceSlots)
        return transition
    });
    triggerPromotion(Number(queueId))
    emitUserStatusUpdate(transition)
    await emitQueueUpdate(Number(queueId))
    const message = transition.to === QueueStatus.WAITING ? "Successfully rejoined" : "Late please rejoin"

    return res.status(200)
        .json(
            new ApiResponse(200, transition, message)
        )

});