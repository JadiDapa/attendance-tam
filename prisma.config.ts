import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * `generate`, `format`, dan `validate` tidak pernah konek ke database, jadi
 * tanpa `.env` (mis. di CI atau checkout baru) dipakai URL placeholder.
 * Perintah yang konek (`migrate`, `db`, `studio`) tetap gagal dengan jelas
 * karena database `placeholder` tidak ada.
 */
const PLACEHOLDER_DATABASE_URL =
  "postgresql://placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: `tsx prisma/seed.ts`,
  },
  datasource: {
    url: process.env.DATABASE_URL ?? PLACEHOLDER_DATABASE_URL,
    // Hanya untuk `npm run db:check-drift` (`migrate diff --from-migrations`).
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
