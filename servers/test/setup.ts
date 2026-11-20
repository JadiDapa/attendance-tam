import { afterAll, beforeEach } from "vitest";

import prisma from "@/lib/prisma";

/**
 * Integration test menghapus isi tabel sebelum tiap test, jadi hanya boleh
 * jalan di database sementara buatan `scripts/with-temp-db.mjs`.
 */
const databaseName = new URL(process.env.DATABASE_URL ?? "postgresql://x/none")
  .pathname.slice(1);

if (!databaseName.startsWith("tam_temp_")) {
  throw new Error(
    `Integration test menolak jalan di database "${databaseName}". Pakai \`npm run test:int\`.`,
  );
}

/** Semua tabel model, kecuali tabel internal Prisma. */
async function truncateAll() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;

  if (tables.length === 0) return;

  const list = tables.map(({ tablename }) => `"${tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} CASCADE`);
}

beforeEach(truncateAll);

afterAll(() => prisma.$disconnect());
