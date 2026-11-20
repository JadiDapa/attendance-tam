import { PrismaClient, type Prisma } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Klien Prisma atau transaksi interaktif pemanggil. Service yang bisa ikut
 * transaksi orang lain menerimanya sebagai parameter terakhir.
 */
export type Db = Prisma.TransactionClient;

export { prisma };
export default prisma;
