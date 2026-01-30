import { QueueStatus } from "../../generated/prisma/enums.js";
import { prisma } from "../db/prisma.js";
import { enqueueCheckLateExpiry } from "../jobs/lateExpiry.js";

export function startLateExpirySafetyNet() {
    console.log("[late-expiry-safety-net] worker ready")
    setInterval(async () => {
        try {

            const now = new Date()
            const lateUsers = await prisma.queueUser.findMany({
                where: {
                    status: QueueStatus.LATE,
                    expiresAt: {
                        lte: now, //less than or equal 
                    },

                }
            });
            for (const qu of lateUsers) {
                await enqueueCheckLateExpiry({ userId: qu.userId, queueId: qu.queueId }, 0);
                console.log(`Safety net enqueued late-expiry job for ${qu.userId}`);
            }
        } catch (err) {
            console.error("[late-expiry-safety-net] error", err);
        }
    }, 30_000);
}