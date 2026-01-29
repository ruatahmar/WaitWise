import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../db/prisma.js"
//transaction wrapper
export async function withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return await prisma.$transaction(fn);
}
