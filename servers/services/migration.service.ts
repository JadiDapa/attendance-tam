import prisma, { type Db } from "@/lib/prisma";

/**
 * Pengaman skrip sekali jalan (`scripts/koreksi-sabtu.ts`, skrip pemetaan
 * Divisi): pastikan database sasaran sudah memuat migrasi rilis yang
 * dibutuhkan, sebelum membaca atau menulis apa pun.
 */
export const MigrationService = {
  /**
   * `ok` kalau `name` sudah selesai diterapkan dan tidak di-rollback. Database
   * tanpa tabel `_prisma_migrations` (restore gagal / salah database) ditolak
   * dengan pesan jelas, bukan error Prisma "relation does not exist".
   */
  async checkApplied(
    name: string,
    db: Db = prisma,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const [table] = await db.$queryRaw<{ exists: boolean }[]>`
      SELECT to_regclass('"_prisma_migrations"') IS NOT NULL AS exists`;
    if (!table?.exists) {
      return {
        ok: false,
        error:
          "Tabel _prisma_migrations tidak ada — database ini kosong atau bukan database aplikasi. Sudah di-restore?",
      };
    }

    const [row] = await db.$queryRaw<{ applied: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM "_prisma_migrations"
        WHERE migration_name = ${name}
          AND finished_at IS NOT NULL AND rolled_back_at IS NULL
      ) AS applied`;

    return row?.applied
      ? { ok: true }
      : { ok: false, error: `Migrasi ${name} belum diterapkan — rilis yang memuatnya belum ada di database ini.` };
  },
};
