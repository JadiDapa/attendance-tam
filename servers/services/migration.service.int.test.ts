import { describe, expect, it } from "vitest";

import { MigrationService } from "@/servers/services/migration.service";

describe("skrip sekali jalan hanya jalan di database yang sudah dimigrasi", () => {
  it("migrasi yang sudah diterapkan lolos", async () => {
    expect(await MigrationService.checkApplied("20261118020000_division_position")).toEqual({
      ok: true,
    });
  });

  it("migrasi yang belum ada di _prisma_migrations ditolak dengan namanya", async () => {
    const result = await MigrationService.checkApplied("29991231000000_belum_ada");

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/29991231000000_belum_ada belum diterapkan/);
  });
});
