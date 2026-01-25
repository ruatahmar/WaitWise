import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../db/prisma.js";
import ApiError from "../../utils/apiError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Request, Response } from "express";
import ApiResponse from "../../utils/apiResponse.js";

export const createQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user;
    const { name, maxActiveUsers, tokenTTL } = req.body;

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
            maxActiveUsers,
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
    const { name, maxActiveUsers, tokenTTL } = req.body;
    const updated = await prisma.queue.updateMany({
        where: { id: Number(queueId), adminId: userId },
        data: {
            name,
            maxActiveUsers,
            turnExpiryMinutes: tokenTTL
        }
    });

    if (updated.count === 0) throw new ApiError(404, "Queue does not exist");
    return res.status(200)
        .json(
            new ApiResponse(200, updated, "Queue updated")
        );

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

export const joinQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params

    const queueToJoin = await prisma.queue.findUnique({
        where: {
            id: Number(queueId),
        }
    })
    if (!queueToJoin) throw new ApiError(404, "This queue does not exist.");

    const alreadyJoined = await prisma.queueUser.findFirst({
        where: {
            queueId: Number(queueId),
            userId
        }
    });

    if (alreadyJoined) {
        throw new ApiError(400, "You already joined this queue.");
    }

    const activeUsersCount = await prisma.queueUser.count({
        where: { queueId: Number(queueId) }
    });
    const maxUsers = queueToJoin.maxActiveUsers ?? Infinity;
    if (activeUsersCount >= maxUsers) throw new ApiError(400, "Queue full.");


    const token = uuidv4()
    const join = await prisma.queueUser.create({
        data: {
            queueId: Number(queueId), // important
            userId,
            position: activeUsersCount + 1,
            token
        }
    });

    return res.status(201).json(new ApiResponse(201, join, "Joined queue"));
});

export const leaveQueue = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params
    const ticket = await prisma.queueUser.delete({
        where: {
            userId_queueId: {
                userId,
                queueId: Number(queueId)
            }
        }
    })
});

export const getQueueStatus = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user
    const { queueId } = req.params
    const ticket = await prisma.queueUser.findUnique({
        where: {
            userId_queueId: {
                userId,
                queueId: Number(queueId)
            }
        }
    })
    if (!ticket) {
        throw new ApiError(404, "You are not in this queue.");
    }
    return res.status(200)
        .json(
            new ApiResponse(200, ticket, "Queue Status Returned")
        )
});

//GET /queues/:queueId/users
//GET /queues/:queueId/serving
//GET /queues/:queueId/length