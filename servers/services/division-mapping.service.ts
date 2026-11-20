import prisma, { type Db } from "@/lib/prisma";
import {
  DIVISION_STRUCTURE,
  planDivisionMapping,
  type MappingEntry,
} from "@/lib/division-mapping";
import { DivisionService } from "@/servers/services/division.service";
import { MigrationService } from "@/servers/services/migration.service";

/**
 * Pemetaan Divisi & Jabatan awal, sekali jalan (tiket 14). Aturan pemetaan
 * ada di `lib/division-mapping.ts`; di sini hanya baca/tulis DB. Jabatan
 * diberikan lewat `DivisionService.assignPosition()` supaya kolom teks
 * jabatan ikut tersinkron. Dijalankan lewat `scripts/pemetaan-divisi.ts`.
 */

/** Migrasi tiket 09 (tabel Division/Position + `User.positionId`). */
export const REQUIRED_MIGRATION = "20261118020000_division_position";

async function loadPlan(db: Db, entries: MappingEntry[]) {
  // Berurutan, bukan Promise.all: `db` bisa berupa transaksi interaktif.
  const divisions = await db.division.findMany({
    select: { id: true, name: true },
  });
  const positions = await db.position.findMany({
    select: { id: true, name: true, divisionId: true },
  });
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      position: true,
      positionId: true,
    },
    orderBy: { name: "asc" },
  });

  const plan = planDivisionMapping({ entries, divisions, positions, users });
  return plan.ok
    ? plan
    : {
        ok: false as const,
        error: plan.errors.map((error) => `\n  - ${error}`).join(""),
      };
}

async function prepare(db: Db, entries: MappingEntry[]) {
  const migration = await MigrationService.checkApplied(REQUIRED_MIGRATION, db);
  if (!migration.ok) return migration;

  return loadPlan(db, entries);
}

export const DivisionMappingService = {
  /** Dry-run: struktur yang akan dibuat & pemetaan user, tanpa menulis apa pun. */
  async preview(entries: MappingEntry[]) {
    return prepare(prisma, entries);
  },

  /**
   * Buat struktur yang belum ada lalu petakan user, dalam satu transaksi.
   * Idempoten: jalan kedua tidak membuat dan tidak memetakan apa pun.
   * Kalau sesudahnya masih ada struktur/pemetaan tersisa, melempar error
   * sehingga seluruh transaksi di-rollback (`remaining` yang kembali selalu 0).
   */
  async apply(entries: MappingEntry[]) {
    return prisma.$transaction(
      async (tx) => {
        const before = await prepare(tx, entries);
        if (!before.ok) return before;

        for (const name of before.createDivisions) {
          await DivisionService.createDivision({ name }, tx);
        }
        const divisions = await tx.division.findMany({
          where: {
            name: { in: DIVISION_STRUCTURE.map(({ division }) => division) },
          },
        });
        for (const position of before.createPositions) {
          const division = divisions.find(
            ({ name }) => name === position.division,
          )!;
          await DivisionService.createPosition(
            { name: position.name, divisionId: division.id },
            tx,
          );
        }

        // Rencana ulang: sekarang semua Jabatan sudah punya id.
        const ready = await loadPlan(tx, entries);
        if (!ready.ok) {
          throw new Error(`Rencana berubah setelah struktur dibuat:${ready.error}`);
        }

        for (const { userId, positionId } of ready.assignments) {
          if (!positionId) {
            throw new Error(`Jabatan untuk user ${userId} belum ada — transaksi dibatalkan.`);
          }
          await DivisionService.assignPosition({ userId, positionId }, tx);
        }

        // Lempar, jangan kembalikan: hanya error yang membuat transaksi di-rollback.
        const after = await loadPlan(tx, entries);
        if (!after.ok) throw new Error(`Pemetaan tidak tuntas:${after.error}`);
        const remaining =
          after.createDivisions.length +
          after.createPositions.length +
          after.assignments.length;
        if (remaining > 0) {
          throw new Error(
            `Pemetaan tidak tuntas: ${remaining} struktur/pemetaan tersisa sesudah apply — transaksi dibatalkan.`,
          );
        }

        return { ...before, assigned: ready.assignments.length, remaining };
      },
      { timeout: 30_000 },
    );
  },

  /** Tutup koneksi DB — dipanggil skrip sekali jalan saat selesai. */
  async disconnect() {
    await prisma.$disconnect();
  },
};
