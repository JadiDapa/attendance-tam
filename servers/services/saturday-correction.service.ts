import prisma, { type Db } from "@/lib/prisma";
import { AttendanceType, Role } from "@/generated/prisma";
import {
  isSaturdayAutoCheckOut,
  planSaturdayCorrection,
  SATURDAY,
  type SaturdayCorrectionRow,
} from "@/lib/saturday-correction";
import { MigrationService } from "@/servers/services/migration.service";

/**
 * Koreksi sekali jalan absen pulang Sabtu 17:00 (tiket 06). Aturan sasaran &
 * jam barunya ada di `lib/saturday-correction.ts`; di sini hanya baca/tulis DB.
 * Dijalankan lewat `scripts/koreksi-sabtu.ts`.
 */

/** Akun Administrator yang dicatat sebagai pengoreksi (`editedById`). */
export const SATURDAY_CORRECTOR_EMAIL = "admin@tarunagroup.co.id";

/**
 * Migrasi pertama sesudah tiket 04 (jam otomatis ikut Jam Pulang, commit
 * 5fdd62b). Kalau sudah diterapkan, kode yang berjalan tidak lagi membuat
 * baris 17:00 baru — baru aman dikoreksi.
 */
export const REQUIRED_MIGRATION = "20261118020000_division_position";

type Failure = { ok: false; error: string };

async function findCorrector(db: Db) {
  const user = await db.user.findUnique({
    where: { email: SATURDAY_CORRECTOR_EMAIL },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  const fail = (error: string): Failure => ({ ok: false, error });

  if (!user) return fail(`Akun ${SATURDAY_CORRECTOR_EMAIL} tidak ada.`);
  if (user.role !== Role.ADMIN) {
    return fail(`Akun ${SATURDAY_CORRECTOR_EMAIL} bukan ADMIN (Role ${user.role}).`);
  }
  if (!user.isActive) return fail(`Akun ${SATURDAY_CORRECTOR_EMAIL} nonaktif.`);

  return { ok: true as const, corrector: { id: user.id, name: user.name, email: user.email } };
}

async function loadPlan(db: Db) {
  const saturday = await db.workDay.findUnique({ where: { dayOfWeek: SATURDAY } });

  // Saring kasar di DB, aturan lengkapnya (Sabtu, tepat 17:00) di lib.
  const checkOuts = (
    await db.attendance.findMany({
      where: {
        type: AttendanceType.CHECK_OUT,
        isManual: true,
        createdByAdminId: null,
        editedAt: null,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        isManual: true,
        createdByAdminId: true,
        editedAt: true,
        workDate: true,
        timestamp: true,
      },
      orderBy: [{ workDate: "asc" }, { userId: "asc" }],
    })
  ).filter((row) => isSaturdayAutoCheckOut({ ...row, checkInTimestamp: null }));

  const checkIns = checkOuts.length
    ? await db.attendance.findMany({
        where: {
          type: AttendanceType.CHECK_IN,
          OR: checkOuts.map(({ userId, workDate }) => ({ userId, workDate })),
        },
        select: { userId: true, workDate: true, timestamp: true },
      })
    : [];
  const checkInAt = (userId: string, workDate: Date) =>
    checkIns.find(
      (row) => row.userId === userId && row.workDate.getTime() === workDate.getTime(),
    )?.timestamp ?? null;

  const rows: SaturdayCorrectionRow[] = checkOuts.map((row) => ({
    ...row,
    checkInTimestamp: checkInAt(row.userId, row.workDate),
  }));

  return planSaturdayCorrection(rows, saturday);
}

async function prepare(db: Db) {
  const migration = await MigrationService.checkApplied(REQUIRED_MIGRATION, db);
  if (!migration.ok) return migration;

  const found = await findCorrector(db);
  if (!found.ok) return found;

  const plan = await loadPlan(db);
  if (!plan.ok) return plan;

  return { ...plan, corrector: found.corrector };
}

export const SaturdayCorrectionService = {
  /** Dry-run: baris yang akan dikoreksi, tanpa menulis apa pun. */
  async preview() {
    return prepare(prisma);
  },

  /**
   * Tulis koreksi dalam satu transaksi. Idempoten: baris yang sudah punya
   * `editedAt` tidak lagi jadi sasaran, jadi jalan kedua mengoreksi 0 baris.
   * `remaining` = sasaran yang tersisa sesudahnya (seharusnya 0).
   */
  async apply() {
    return prisma.$transaction(
      async (tx) => {
        const prepared = await prepare(tx);
        if (!prepared.ok) return prepared;
        if (prepared.conflicts.length > 0) {
          return {
            ok: false as const,
            error: `${prepared.conflicts.length} baris konflik (absen masuk tidak sebelum Jam Pulang Sabtu). Koreksi dulu lewat dialog Edit, lalu ulangi.`,
          };
        }

        const editedAt = new Date();
        let applied = 0;

        for (const correction of prepared.corrections) {
          const { count } = await tx.attendance.updateMany({
            // Syarat diulang supaya baris yang berubah sejak dibaca tidak ikut.
            where: { id: correction.id, editedAt: null, timestamp: correction.from },
            data: {
              timestamp: correction.to,
              originalTimestamp: correction.from,
              editedById: prepared.corrector.id,
              editedAt,
              editNote: prepared.note,
            },
          });
          applied += count;
        }

        if (applied !== prepared.corrections.length) {
          throw new Error(
            `Hanya ${applied} dari ${prepared.corrections.length} baris yang terkoreksi — transaksi dibatalkan.`,
          );
        }

        const after = await loadPlan(tx);

        return {
          ...prepared,
          applied,
          remaining: after.ok ? after.corrections.length : 0,
        };
      },
      { timeout: 30_000 },
    );
  },

  /** Tutup koneksi DB — dipanggil skrip sekali jalan saat selesai. */
  async disconnect() {
    await prisma.$disconnect();
  },
};
