import { describe, expect, it } from "vitest";

import { AttendanceType, Role, WorkMode } from "@/generated/prisma";
import { AttendanceService } from "@/servers/services/attendance.service";
import {
  SATURDAY_CORRECTOR_EMAIL,
  SaturdayCorrectionService,
} from "@/servers/services/saturday-correction.service";
import { WorkScheduleService } from "@/servers/services/setting.service";
import { UserService } from "@/servers/services/user.service";

const SAT = new Date("2026-11-14T00:00:00Z");

const wib = (date: Date, time: string) =>
  new Date(`${date.toISOString().slice(0, 10)}T${time}:00+07:00`);

let clerkSeq = 0;
const createUser = (email: string, role: Role = Role.EMPLOYEE) =>
  UserService.create({ clerkId: `user_test_${++clerkSeq}`, name: email, email, role });

const createAdministrator = () => createUser(SATURDAY_CORRECTOR_EMAIL, Role.ADMIN);

/** Senin–Jumat 08:00–17:00, Sabtu 08:00–14:00, Minggu libur. */
async function saveWeek(saturday: { isWorkingDay: boolean; checkOutTime: string }) {
  await WorkScheduleService.save({
    lateToleranceMinutes: 15,
    maxAccuracyMeters: 100,
    days: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      isWorkingDay: dayOfWeek !== 0,
      checkInTime: "08:00",
      checkOutTime: "17:00",
      overtimeStartTime: "18:00",
      ...(dayOfWeek === 6 ? { ...saturday, overtimeStartTime: "14:00" } : {}),
    })),
  });
}

/** Absen pulang yang dikonfirmasi karyawan sendiri (Absen Pulang Terlewat). */
const confirmCheckOut = (userId: string, workDate: Date, time: string) =>
  AttendanceService.selfConfirmCheckout({ userId, workDate, timestamp: wib(workDate, time) });

describe("koreksi absen pulang otomatis Sabtu 17:00", () => {
  it("dry-run tidak menulis; apply mengoreksi ke 14:00 dengan jejak; apply kedua 0 baris", async () => {
    const admin = await createAdministrator();
    const harry = await createUser("harry@test.local");
    await saveWeek({ isWorkingDay: true, checkOutTime: "14:00" });
    const auto = await confirmCheckOut(harry.id, SAT, "17:00");

    const preview = await SaturdayCorrectionService.preview();
    expect(preview).toMatchObject({ ok: true, corrections: [{ id: auto.id }] });
    expect((await AttendanceService.getById(auto.id))?.editedAt).toBeNull();

    const first = await SaturdayCorrectionService.apply();
    expect(first).toMatchObject({ ok: true, applied: 1, remaining: 0 });

    const corrected = await AttendanceService.getById(auto.id);
    expect(corrected).toMatchObject({
      timestamp: new Date("2026-11-14T07:00:00Z"),
      originalTimestamp: new Date("2026-11-14T10:00:00Z"),
      editedById: admin.id,
      editNote: "Koreksi sistem: jam pulang otomatis Sabtu seharusnya 14:00",
    });
    expect(corrected?.editedAt).toBeInstanceOf(Date);

    expect(await SaturdayCorrectionService.apply()).toMatchObject({
      ok: true,
      applied: 0,
      remaining: 0,
    });
  });

  it("seperti produksi: 47 baris dikoreksi, anomali 05:00/07:01 dan baris 14:00 tidak tersentuh", async () => {
    await createAdministrator();
    await saveWeek({ isWorkingDay: true, checkOutTime: "14:00" });
    const saturdays = Array.from(
      { length: 6 },
      (_, week) => new Date(SAT.getTime() - week * 7 * 24 * 60 * 60 * 1000),
    );
    const employees = await Promise.all(
      Array.from({ length: 10 }, (_, i) => createUser(`teknisi${i}@test.local`)),
    );
    // 47 absen pulang otomatis 17:00 (8 karyawan × 6 Sabtu, kurang satu) …
    const slots = employees
      .slice(0, 8)
      .flatMap((employee) => saturdays.map((workDate) => ({ employee, workDate })))
      .slice(0, 47);
    for (const { employee, workDate } of slots) {
      await confirmCheckOut(employee.id, workDate, "17:00");
    }
    // … 12 yang sudah 14:00, dua anomali, dan 17:00 di hari Jumat.
    const [ninth, tenth] = employees.slice(8);
    const untouched = [
      ...(await Promise.all(saturdays.map((day) => confirmCheckOut(ninth.id, day, "14:00")))),
      ...(await Promise.all(saturdays.map((day) => confirmCheckOut(tenth.id, day, "14:00")))),
      await confirmCheckOut(employees[7].id, saturdays[5], "05:00"),
      await confirmCheckOut(ninth.id, new Date("2026-11-13T00:00:00Z"), "17:00"),
    ];
    const anomaly0701 = await confirmCheckOut(tenth.id, new Date("2026-09-26T00:00:00Z"), "07:01");

    const preview = await SaturdayCorrectionService.preview();
    expect(preview.ok && preview.corrections).toHaveLength(47);

    expect(await SaturdayCorrectionService.apply()).toMatchObject({ applied: 47, remaining: 0 });
    for (const row of [...untouched, anomaly0701]) {
      expect(await AttendanceService.getById(row.id)).toMatchObject({
        timestamp: row.timestamp,
        editedAt: null,
      });
    }
  });
});

describe("berhenti total tanpa menulis apa pun", () => {
  it.each<[string, () => Promise<unknown>, RegExp]>([
    ["akun Administrator tidak ada", async () => {}, /tidak ada/],
    [
      "akun pengoreksi bukan ADMIN",
      () => createUser(SATURDAY_CORRECTOR_EMAIL, Role.EMPLOYEE),
      /bukan ADMIN/,
    ],
    [
      "akun Administrator nonaktif",
      async () => UserService.setActive((await createAdministrator()).id, false),
      /nonaktif/,
    ],
    [
      "Sabtu bukan Hari Kerja",
      async () => {
        await createAdministrator();
        await saveWeek({ isWorkingDay: false, checkOutTime: "14:00" });
      },
      /bukan Hari Kerja/,
    ],
    [
      "ada baris konflik (absen masuk tidak sebelum 14:00)",
      async () => {
        await createAdministrator();
        const hery = await createUser("hery@test.local");
        await AttendanceService.upsertManual({
          userId: hery.id,
          workDate: SAT,
          type: AttendanceType.CHECK_IN,
          timestamp: wib(SAT, "14:30"),
          workMode: WorkMode.HADIR_DIKANTOR,
          isLate: true,
          lateMinutes: 390,
          reviewedById: hery.id,
          reviewNote: "absen masuk siang",
        });
        await confirmCheckOut(hery.id, SAT, "17:00");
      },
      /1 baris konflik/,
    ],
  ])("%s", async (_, arrange, message) => {
    await saveWeek({ isWorkingDay: true, checkOutTime: "14:00" });
    await arrange();
    const harry = await createUser("harry@test.local");
    const auto = await confirmCheckOut(harry.id, SAT, "17:00");

    const result = await SaturdayCorrectionService.apply();

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(message);
    expect(await AttendanceService.getById(auto.id)).toMatchObject({
      timestamp: auto.timestamp,
      editedAt: null,
    });
  });
});
