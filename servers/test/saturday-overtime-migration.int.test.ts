import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import prisma from "@/lib/prisma";

/**
 * Migrasi data Jam Mulai Lembur Sabtu: Lembur Sabtu dimulai tepat di Jam
 * Pulang (14:00), bukan Jam Pulang + 1 jam. Migrasinya sudah diputar di
 * database sementara saat tabel masih kosong, jadi di sini SQL-nya dijalankan
 * ulang terhadap baris `WorkDay` yang disiapkan test.
 */
const MIGRATION_SQL = readFileSync(
  join(process.cwd(), "prisma/migrations/20261120010000_saturday_overtime_at_check_out/migration.sql"),
  "utf8",
);

type Day = { dayOfWeek: number; checkOutTime: string; overtimeStartTime: string };

async function runMigrationOn(days: Day[]) {
  await prisma.workDay.createMany({
    data: days.map((day) => ({ ...day, isWorkingDay: day.dayOfWeek !== 0, checkInTime: "08:00" })),
  });
  await prisma.$executeRawUnsafe(MIGRATION_SQL);

  const rows = await prisma.workDay.findMany({ orderBy: { dayOfWeek: "asc" } });
  return Object.fromEntries(rows.map((row) => [row.dayOfWeek, row.overtimeStartTime]));
}

describe("migrasi Jam Mulai Lembur Sabtu = Jam Pulang", () => {
  it("Sabtu yang masih nilai awal (15:00) jadi 14:00; Senin–Jumat tetap 18:00", async () => {
    const result = await runMigrationOn([
      { dayOfWeek: 0, checkOutTime: "17:00", overtimeStartTime: "18:00" },
      { dayOfWeek: 1, checkOutTime: "17:00", overtimeStartTime: "18:00" },
      { dayOfWeek: 5, checkOutTime: "17:00", overtimeStartTime: "18:00" },
      { dayOfWeek: 6, checkOutTime: "14:00", overtimeStartTime: "15:00" },
    ]);

    expect(result).toEqual({ 0: "18:00", 1: "18:00", 5: "18:00", 6: "14:00" });
  });

  it("tidak menimpa Jam Mulai Lembur Sabtu yang sudah diubah admin", async () => {
    const result = await runMigrationOn([
      { dayOfWeek: 6, checkOutTime: "14:00", overtimeStartTime: "16:30" },
    ]);

    expect(result).toEqual({ 6: "16:30" });
  });

  it("menjalankan ulang tidak mengubah apa-apa", async () => {
    await runMigrationOn([{ dayOfWeek: 6, checkOutTime: "14:00", overtimeStartTime: "15:00" }]);
    await prisma.$executeRawUnsafe(MIGRATION_SQL);

    const saturday = await prisma.workDay.findUnique({ where: { dayOfWeek: 6 } });
    expect(saturday?.overtimeStartTime).toBe("14:00");
  });
});
