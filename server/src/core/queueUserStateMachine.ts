import { CANCELLED } from "node:dns";
import { Prisma } from "../../generated/prisma/client.js";
import { QueueEventType, QueueStatus } from "../../generated/prisma/enums.js";
import ApiError from "../utils/apiError.js";
import { enqueueCheckLateExpiry } from "../jobs/lateExpiry.js";
import { enqueuePromoteIfFree } from "../jobs/promoteIfFreeSlot.js";
import { logEvent } from "../utils/eventAudit.js";

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

const queueEventsMapper = {
    SERVE: QueueEventType.QUEUEUSER_SERVED,
    LEAVE: QueueEventType.QUEUEUSER_LEFT,
    COMPLETE: QueueEventType.QUEUEUSER_COMPLETED,
    MARK_LATE: QueueEventType.QUEUEUSER_LATE,
    REJOIN: QueueEventType.QUEUEUSER_REJOINED,
    MISSED: QueueEventType.QUEUEUSER_MISSED
}
export type QueueUserEvent = keyof typeof queueEventsMapper;


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
    userId: number,
    queueId: number,
    event: QueueUserEvent,
    ctx: TransitionContext,
) {
    const qu = await tx.queueUser.findUnique({
        where: {
            userId_queueId: {
                userId,
                queueId,
            },
        },
    });
    if (!qu) throw new ApiError(404, "User not found");
    //Validate transition
    const nextStatus = decideQueueUserTransition(qu.status, event)

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
    if (qu.status === QueueStatus.LATE && event === "REJOIN") {
        if (!qu.expiresAt) throw new ApiError(500, "Invariant violation: LATE user has no expiresAt")
        if (checkIfMissed(qu.expiresAt, ctx.now)) {
            updates.status = QueueStatus.MISSED
        }
        else {
            updates.priorityBoost = 1
        }
    }
    if (event === "SERVE" && ctx.actor !== "system") {
        throw new ApiError(403, "Only system can promote users");
    }
    //Update with guard
    const updated = await tx.queueUser.updateMany({
        where: {
            userId: qu.userId,
            queueId,
            status: qu.status
        },
        data: updates,
    });
    console.log("Updates :", updates)
    console.log("Updated Count :", updated);
    if (updated.count !== 1) {
        throw new ApiError(400, "State changed concurrently");
    }
    await logEvent(
        tx,
        queueId,
        queueEventsMapper[event],
        {
            actor: ctx.actor,
            from: qu.status,
            to: updates.nextStatus
        },
        qu.id
    )
    //background worker     
    if (event === "MARK_LATE") {
        const expiresAt = updates.expiresAt
        const now = ctx.now ?? new Date()
        const delayMs = Math.max(0, expiresAt.getTime() - now.getTime());

        await enqueueCheckLateExpiry(
            { userId: qu.userId, queueId: qu.queueId },
            delayMs
        )
    }
    if (event === "MISSED" || event === "COMPLETE" || event === "LEAVE" || event === "REJOIN") {
        await enqueuePromoteIfFree({ queueId: qu.queueId })
    }
    // await emitEvent(tx, qu.status, nextStatus, event)

    return { from: qu.status, to: nextStatus };
}
export function decideQueueUserTransition(
    currentStatus: QueueStatus,
    event: QueueUserEvent
): QueueStatus {
    const stateTransitions = transitions[currentStatus as keyof typeof transitions];
    if (!stateTransitions || !(event in stateTransitions)) {
        throw new Error(`Illegal transition ${currentStatus} → ${event}`);
    }

    return stateTransitions[event as keyof typeof stateTransitions];
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

