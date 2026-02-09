import { prisma } from "../src/infra/db";
import jwt from "jsonwebtoken";

const SECRET = process.env.TOKEN_KEY!;

export default async function generateTokens(takeNum: number | undefined = undefined, skipNum: number | undefined = undefined) {
    const users = await prisma.user.findMany({
        select: { id: true },
        orderBy: { id: "asc" },
        take: takeNum,
        skip: skipNum
    });

    const tokens = users.map((u) =>
        jwt.sign({ userId: u.id }, SECRET)
    );

    console.log("Generated tokens:", tokens.length);

    return tokens;
}


