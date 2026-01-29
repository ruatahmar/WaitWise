import { CANCELLED } from "node:dns";
import { Prisma } from "../../generated/prisma/client.js";
import { QueueStatus } from "../../generated/prisma/enums.js";
import ApiError from "../utils/apiError.js";

/**
 * QueueUser state transitions are centralized here to:
 * - enforce invariants
 * - prevent illegal state changes
 * - guard against concurrent updates
 */

const transitions = {
    WAITING: {
        SERVE: QueueStatus.SERVING,
        LEAVE: QueueStatus.CANCELLED,
    },

    SERVING: {
        COMPLETE: QueueStatus.COMPLETED,
        MARK_LATE: QueueStatus.LATE,
        LEAVE: QueueStatus.CANCELLED,
    },

    LATE: {
        REJOIN: QueueStatus.WAITING,
        MISSED: QueueStatus.MISSED,
        LEAVE: QueueStatus.CANCELLED,
    },

    CANCELLED: {
        REJOIN: QueueStatus.WAITING,
    },

    MISSED: {
        REJOIN: QueueStatus.WAITING
    }
};

//need future update to be more dynamic
export type QueueUserEvent =
    | "SERVE"
    | "LEAVE"
    | "COMPLETE"
    | "MARK_LATE"
    | "REJOIN"
    | "MISSED";

export interface TransitionContext {
    actor: "admin" | "system" | "user";
    reason?: string;
    now?: Date;
    queue?: {
        id: number;
        turnExpiryMinutes: number;
    };
}

export async function transitionQueueUser(
    tx: Prisma.TransactionClient,
    queueUserId: number,
    queueId: number,
    event: QueueUserEvent,
    ctx: TransitionContext,
) {
    const qu = await tx.queueUser.findUnique({
        where: {
            userId_queueId: {
                userId: queueUserId,
                queueId,
            },
        },
    });
    if (!qu) throw new ApiError(404, "User not found");
    //Validate transition
    const stateTransitions = transitions[qu.status as keyof typeof transitions];
    if (!stateTransitions || !(event in stateTransitions)) {
        throw new ApiError(400, `Illegal transition ${qu.status} → ${event}`);
    }

    const nextStatus = stateTransitions[
        event as keyof typeof stateTransitions
    ] as QueueStatus;

    //Apply side effects
    const updates: any = { status: nextStatus };
    if (qu.status === QueueStatus.SERVING && nextStatus === QueueStatus.COMPLETED) {
        const now = ctx.now ?? new Date();
        updates.servedAt = now;
    }
    if (nextStatus === QueueStatus.LATE) {
        updates.expiresAt = await computeExpiry(qu.queueId, ctx, tx);
    }
    if (qu.status === QueueStatus.LATE && nextStatus !== QueueStatus.LATE) {
        updates.expiresAt = null
    }
    if (event === "REJOIN") {
        if (!qu.expiresAt) throw new ApiError(500, "Invariant violation: LATE user has no expiresAt")
        if (checkIfMissed(qu.expiresAt, ctx.now)) {
            updates.status = QueueStatus.MISSED
        }
        else {
            updates.priorityBoost = 1
        }
    }
    //Update with guard
    const updated = await tx.queueUser.updateMany({
        where: {
            userId: queueUserId,
            queueId,
            status: qu.status
        },
        data: updates,
    });
    console.log(updated);
    if (updated.count !== 1) {
        throw new ApiError(400, "State changed concurrently");
    }
    // await emitEvent(tx, qu.status, nextStatus, event)

    return { from: qu.status, to: nextStatus };
}

function checkIfMissed(
    expiresAt: Date,
    now: Date = new Date(Date.now())
) {
    return now > expiresAt
}

async function computeExpiry(
    queueId: number,
    ctx: TransitionContext,
    tx: Prisma.TransactionClient,
) {
    let turnExpiryMinutes: number;

    if (ctx.queue && ctx.queue.id === queueId) {
        turnExpiryMinutes = ctx.queue.turnExpiryMinutes;
    } else {
        const queue = await tx.queue.findUnique({
            where: { id: queueId },
            select: { turnExpiryMinutes: true },
        });
        if (!queue) throw new Error("Queue not found");
        turnExpiryMinutes = queue.turnExpiryMinutes;
    }

    return new Date(
        (ctx.now ?? new Date()).getTime() + turnExpiryMinutes * 60_000,
    );
}
// function emitEvent(tx, status, nextStatus, event) {

// }
