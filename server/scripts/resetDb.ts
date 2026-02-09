import { prisma } from "../src/infra/db";


async function resetDb() {
    await prisma.$transaction([
        prisma.queueUser.deleteMany(),
        prisma.queue.deleteMany(),
        prisma.refreshToken.deleteMany(),
        prisma.user.deleteMany(),
    ]);
}

resetDb().catch(console.error)