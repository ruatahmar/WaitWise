import { describe, it, expect } from "vitest";
import { decideQueueUserTransition } from "../src/core/queueUserStateMachine"
import { QueueStatus } from "../generated/prisma/enums";

describe("QueueUser State Transition", () => {
    //allowed
    it("allows WAITING -> SERVING", () => {
        const nextStatus = decideQueueUserTransition(
            QueueStatus.WAITING,
            "SERVE"
        );
        expect(nextStatus).toBe(QueueStatus.SERVING)
    })
    it("allows WAITING -> LEAVE", () => {
        const nextStatus = decideQueueUserTransition(
            QueueStatus.WAITING,
            "LEAVE"
        );
        expect(nextStatus).toBe(QueueStatus.CANCELLED)
    })
    it("allows SERVING -> COMPLETE", () => {
        const nextStatus = decideQueueUserTransition(
            QueueStatus.SERVING,
            "COMPLETE"
        );
        expect(nextStatus).toBe(QueueStatus.COMPLETED)
    })
    it("allows SERVING -> LATE", () => {
        const nextStatus = decideQueueUserTransition(
            QueueStatus.SERVING,
            "MARK_LATE"
        );
        expect(nextStatus).toBe(QueueStatus.LATE)
    })
    it("allows SERVING -> LEAVE", () => {
        const nextStatus = decideQueueUserTransition(
            QueueStatus.SERVING,
            "LEAVE"
        );
        expect(nextStatus).toBe(QueueStatus.CANCELLED)
    })
    it("allows LATE -> REJOIN", () => {
        const nextStatus = decideQueueUserTransition(
            QueueStatus.LATE,
            "REJOIN"
        );
        expect(nextStatus).toBe(QueueStatus.WAITING)
    })
    it("allows LATE -> MISSED", () => {
        const nextStatus = decideQueueUserTransition(
            QueueStatus.LATE,
            "MISSED"
        );
        expect(nextStatus).toBe(QueueStatus.MISSED)
    })
    it("allows LATE -> LEAVE", () => {
        const nextStatus = decideQueueUserTransition(
            QueueStatus.LATE,
            "LEAVE"
        );
        expect(nextStatus).toBe(QueueStatus.CANCELLED)
    })
    it("allows CANCELLED -> REJOIN", () => {
        const nextStatus = decideQueueUserTransition(
            QueueStatus.CANCELLED,
            "REJOIN"
        );
        expect(nextStatus).toBe(QueueStatus.WAITING)
    })
    it("allows MISSED -> REJOIN", () => {
        const nextStatus = decideQueueUserTransition(
            QueueStatus.MISSED,
            "REJOIN"
        );
        expect(nextStatus).toBe(QueueStatus.WAITING)
    })
    //Not Allowed
    it("disallow WAITING -> COMPLETE", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.WAITING,
                "COMPLETE"
            )
        }).toThrow()
    })
    it("disallow WAITING -> LATE", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.WAITING,
                "MARK_LATE"
            )
        }).toThrow()
    })
    it("disallow WAITING -> MISSED", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.WAITING,
                "MISSED"
            )
        }).toThrow()
    })
    it("disallow SERVING -> MISSED", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.SERVING,
                "MISSED"
            )
        }).toThrow()
    })
    it("disallow LATE -> COMPLETE", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.LATE,
                "COMPLETE"
            )
        }).toThrow()
    })
    it("disallow LATE -> SERVING", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.LATE,
                "SERVE"
            )
        }).toThrow()
    })
    it("disallow MISSED -> COMPLETE", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.MISSED,
                "COMPLETE"
            )
        }).toThrow()
    })
    it("disallow MISSED -> SERVING", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.MISSED,
                "SERVE"
            )
        }).toThrow()
    })
    it("disallow MISSED -> LATE", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.MISSED,
                "MARK_LATE"
            )
        }).toThrow()
    })
    it("disallow MISSED -> CANCELLED", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.MISSED,
                "LEAVE"
            )
        }).toThrow()
    })
    it("disallow CANCELLED -> COMPLETE", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.CANCELLED,
                "COMPLETE"
            )
        }).toThrow()
    })
    it("disallow CANCELLED -> SERVING", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.CANCELLED,
                "SERVE"
            )
        }).toThrow()
    })
    it("disallow CANCELLED -> LATE", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.CANCELLED,
                "MARK_LATE"
            )
        }).toThrow()
    })
    it("disallow CANCELLED -> MISSED", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.CANCELLED,
                "MISSED"
            )
        }).toThrow()
    })
    it("throws on unknown event", () => {
        expect(() => {
            decideQueueUserTransition(
                QueueStatus.WAITING,
                "UNKNOWN_EVENT" as any
            );
        }).toThrow();
    });
})