import { describe, expect, it } from "vitest";

import { findUnsafeStatements } from "./check-migrations.mjs";

const reasonsFor = (sql) => findUnsafeStatements(sql).map((issue) => issue.reason);

describe("migrasi yang hanya menambah lolos", () => {
  it("kolom nullable baru", () => {
    expect(reasonsFor(`ALTER TABLE "User" ADD COLUMN "nickname" TEXT;`)).toEqual([]);
  });

  it("kolom wajib dengan nilai default, lalu di-backfill", () => {
    const sql = `
      ALTER TABLE "WorkDay" ADD COLUMN "overtimeStartTime" TEXT NOT NULL DEFAULT '18:00';
      UPDATE "WorkDay" SET "overtimeStartTime" = to_char("checkOutTime"::time + INTERVAL '1 hour', 'HH24:MI');
    `;

    expect(reasonsFor(sql)).toEqual([]);
  });

  it("tabel baru boleh punya kolom wajib, index, dan foreign key", () => {
    const sql = `
      CREATE TABLE "Division" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, CONSTRAINT "Division_pkey" PRIMARY KEY ("id"));
      CREATE UNIQUE INDEX "Division_name_key" ON "Division"("name");
      ALTER TABLE "User" ADD COLUMN "divisionId" TEXT,
      ADD CONSTRAINT "User_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      ALTER TYPE "Role" ADD VALUE 'MANAGER';
    `;

    expect(reasonsFor(sql)).toEqual([]);
  });

  it("kata terlarang di dalam komentar, string, atau nama kolom tidak dihitung", () => {
    const sql = `
      -- DROP dan RENAME hanya disebut di komentar
      ALTER TABLE "Attendance" ADD COLUMN "dropReason" TEXT DEFAULT 'drop; rename';
      ALTER TABLE "Attendance" ADD COLUMN "drop" TEXT;
    `;

    expect(reasonsFor(sql)).toEqual([]);
  });
});

describe("migrasi yang mengubah atau membuang data produksi ditolak", () => {
  it("kolom wajib tanpa default", () => {
    expect(
      reasonsFor(`ALTER TABLE "WorkDay" ADD COLUMN "overtimeStartTime" TEXT NOT NULL;`),
    ).toEqual(["kolom wajib (NOT NULL) tanpa DEFAULT"]);
  });

  it("satu klausa buruk di antara banyak ADD COLUMN", () => {
    const sql = `ALTER TABLE "Overtime" ADD COLUMN "editNote" TEXT,
      ADD COLUMN "editedAt" TIMESTAMP(3) NOT NULL,
      ADD COLUMN "count" INTEGER NOT NULL DEFAULT 0;`;

    expect(reasonsFor(sql)).toEqual(["kolom wajib (NOT NULL) tanpa DEFAULT"]);
  });

  it("menjadikan kolom lama wajib", () => {
    expect(
      reasonsFor(`ALTER TABLE "WorkDay" ALTER COLUMN "overtimeStartTime" SET NOT NULL;`),
    ).toEqual(["menjadikan kolom yang ada wajib (SET NOT NULL)"]);
  });

  it("drop tabel, kolom, atau default", () => {
    expect(reasonsFor(`DROP TABLE "AccountRequest";`)).toEqual(["DROP"]);
    expect(reasonsFor(`ALTER TABLE "User" DROP COLUMN "position";`)).toEqual(["DROP"]);
    expect(reasonsFor(`ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;`)).toEqual(["DROP"]);
  });

  it("melonggarkan kolom jadi nullable tetap boleh", () => {
    expect(
      reasonsFor(`ALTER TABLE "Attendance" ALTER COLUMN "photoUrl" DROP NOT NULL;`),
    ).toEqual([]);
  });

  it("rename, ganti tipe, dan hapus data", () => {
    expect(reasonsFor(`ALTER TABLE "User" RENAME COLUMN "position" TO "jobTitle";`)).toEqual(["RENAME"]);
    expect(
      reasonsFor(`ALTER TABLE "User" ALTER COLUMN "phone" SET DATA TYPE INTEGER;`),
    ).toEqual(["mengganti tipe kolom"]);
    expect(reasonsFor(`DELETE FROM "Holiday";`)).toEqual(["menghapus data"]);
  });

  it("komentar migration-safety: allow tepat di atas statement melewatkannya", () => {
    const sql = `
      -- migration-safety: allow — mobile 1.2 sudah tidak membaca kolom ini
      ALTER TABLE "User" DROP COLUMN "position";
      ALTER TABLE "User" DROP COLUMN "phone";
    `;

    expect(reasonsFor(sql)).toEqual(["DROP"]);
  });
});
