import { prisma } from "../../src/infra/db";

async function seedQueues() {
    const queueNum = 6
    const queues = []

    const admin = await prisma.user.findUnique({
        where: { email: "test@test.com" }
    });
    if (!admin) throw new Error("Admin user not found");
    const adminId = admin.id;

    for (let i = 0; i < queueNum; i++) {
        queues.push({
            name: `Queue ${i}`,
            adminId,
            maxSize: 100,
            graceTime: 1,
            serviceSlots: 2
        })
    }
    try {
        await prisma.queue.createMany({
            data: queues,
            skipDuplicates: true
        })
        console.log("Queues seeded")
    } catch (error) {
        console.log(error)
    }

}

seedQueues()