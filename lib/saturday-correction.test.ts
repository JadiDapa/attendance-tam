import { describe, expect, it } from "vitest";

import {
  planSaturdayCorrection,
  type SaturdayCorrectionRow,
} from "@/lib/saturday-correction";
import type { WorkDayConfig } from "@/lib/work-schedule";

/** Hari Kerja Sabtu yang berlaku sekarang: 08:00–14:00. */
const SATURDAY: WorkDayConfig = {
  dayOfWeek: 6,
  isWorkingDay: true,
  checkInTime: "08:00",
  checkOutTime: "14:00",
  overtimeStartTime: "14:00",
};

/** Sabtu 14 Nov 2026 dan Jumat sehari sebelumnya (kolom `date`). */
const SAT = new Date("2026-11-14T00:00:00Z");
const FRI = new Date("2026-11-13T00:00:00Z");

/** Jam dinding WIB pada tanggal kerja → timestamp UTC. */
const wib = (date: Date, time: string) =>
  new Date(`${date.toISOString().slice(0, 10)}T${time}:00+07:00`);

/** Absen pulang hasil tombol "Otomatis 17:00" lama, dikonfirmasi karyawan sendiri. */
const autoCheckOut = (
  overrides: Partial<SaturdayCorrectionRow> = {},
): SaturdayCorrectionRow => ({
  id: "att_1",
  userId: "user_1",
  type: "CHECK_OUT",
  isManual: true,
  createdByAdminId: null,
  editedAt: null,
  workDate: SAT,
  timestamp: wib(SAT, "17:00"),
  checkInTimestamp: wib(SAT, "08:02"),
  ...overrides,
});

describe("absen pulang otomatis Sabtu 17:00 dikoreksi ke Jam Pulang Sabtu", () => {
  it("jam pulang 17:00 di hari Sabtu menjadi 14:00, jam lama tercatat", () => {
    const plan = planSaturdayCorrection([autoCheckOut()], SATURDAY);

    expect(plan).toEqual({
      ok: true,
      note: "Koreksi sistem: jam pulang otomatis Sabtu seharusnya 14:00",
      corrections: [
        {
          id: "att_1",
          userId: "user_1",
          workDate: SAT,
          from: new Date("2026-11-14T10:00:00Z"),
          to: new Date("2026-11-14T07:00:00Z"),
        },
      ],
      conflicts: [],
    });
  });

  it.each<[string, Partial<SaturdayCorrectionRow>]>([
    ["anomali pulang 05:00", { timestamp: wib(SAT, "05:00") }],
    ["anomali pulang 07:01", { timestamp: wib(SAT, "07:01") }],
    ["sudah 14:00", { timestamp: wib(SAT, "14:00") }],
    ["17:00 lewat semenit", { timestamp: wib(SAT, "17:01") }],
    ["17:00 di hari Jumat", { workDate: FRI, timestamp: wib(FRI, "17:00") }],
    ["17:00 WIB tanggal lain dari tanggal kerja", { timestamp: wib(FRI, "17:00") }],
    ["absen pulang langsung dari HP", { isManual: false }],
    ["ditambahkan admin", { createdByAdminId: "admin_1" }],
    ["sudah pernah dikoreksi admin", { editedAt: new Date("2026-11-16T03:00:00Z") }],
    ["absen masuk", { type: "CHECK_IN" }],
  ])("tidak menyentuh: %s", (_, overrides) => {
    const plan = planSaturdayCorrection([autoCheckOut(overrides)], SATURDAY);

    expect(plan).toMatchObject({ ok: true, corrections: [], conflicts: [] });
  });

  it("baris yang absen masuknya tidak sebelum 14:00 dilaporkan sebagai konflik, tidak dikoreksi", () => {
    const plan = planSaturdayCorrection(
      [autoCheckOut({ checkInTimestamp: wib(SAT, "14:30") })],
      SATURDAY,
    );

    expect(plan).toMatchObject({
      ok: true,
      corrections: [],
      conflicts: [
        {
          id: "att_1",
          from: new Date("2026-11-14T10:00:00Z"),
          to: new Date("2026-11-14T07:00:00Z"),
          reason: "Jam pulang harus setelah jam masuk 14:30",
        },
      ],
    });
  });

  it("tetap mengoreksi kalau tanggal itu tidak punya absen masuk", () => {
    const plan = planSaturdayCorrection(
      [autoCheckOut({ checkInTimestamp: null })],
      SATURDAY,
    );

    expect(plan).toMatchObject({ ok: true, corrections: [{ id: "att_1" }], conflicts: [] });
  });
});

describe("berhenti total kalau Jam Pulang Sabtu tidak bisa dipakai", () => {
  it.each<[string, WorkDayConfig | null, RegExp]>([
    ["Sabtu bukan Hari Kerja", { ...SATURDAY, isWorkingDay: false }, /bukan Hari Kerja/],
    ["baris Sabtu tidak ada di WorkDay", null, /tidak ada/],
    ["Jam Pulang Sabtu masih 17:00", { ...SATURDAY, checkOutTime: "17:00" }, /17:00, bukan 14:00/],
    ["Jam Pulang Sabtu 13:00", { ...SATURDAY, checkOutTime: "13:00" }, /13:00, bukan 14:00/],
  ])("%s", (_, saturday, message) => {
    const plan = planSaturdayCorrection([autoCheckOut()], saturday);

    expect(plan.ok).toBe(false);
    expect(!plan.ok && plan.error).toMatch(message);
  });
});
