import { prisma } from "../../src/infra/db"


async function seedUsers() {
    const userNum = 200;
    const userArray = []
    for (let i = 0; i < userNum; i++) {
        userArray.push({
            email: `dummy${i}@seeded.com`,
            name: `dummy${i}`,
            password: "123456"
        })
    }
    try {

        await prisma.user.createMany({
            data: userArray,
            skipDuplicates: true,
        })
        console.log("uses seeded")

    } catch (error) {
        console.log(error)
    }

}

seedUsers()