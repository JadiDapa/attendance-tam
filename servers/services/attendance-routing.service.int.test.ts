import { describe, expect, it } from "vitest";

import {
  AttendanceApproval,
  AttendanceType,
  Role,
  WorkMode,
  type User,
} from "@/generated/prisma";
import { ApprovalRoutingService } from "@/servers/services/approval-routing.service";
import { AttendanceService } from "@/servers/services/attendance.service";
import { DivisionService } from "@/servers/services/division.service";
import { UserService } from "@/servers/services/user.service";

const WORK_DATE = new Date("2026-11-16T00:00:00Z");

let clerkSeq = 0;

const createUser = (name: string, role: Role = Role.EMPLOYEE) =>
  UserService.create({
    clerkId: `user_test_${++clerkSeq}`,
    name,
    email: `${name.toLowerCase()}@test.local`,
    role,
  });

/** Divisi dengan satu Jabatan; `holders` langsung diberi Jabatan itu. */
async function division(name: string, holders: User[]) {
  const division = await DivisionService.createDivision({ name });
  const position = await DivisionService.createPosition({
    name: `Staf ${name}`,
    divisionId: division.id,
  });
  for (const user of holders) {
    await DivisionService.assignPosition({ userId: user.id, positionId: position.id });
  }
  return division;
}

/** Absen masuk luar radius yang menunggu keputusan — seperti antrean lama di produksi. */
const pendingOutside = (userId: string) =>
  AttendanceService.create({
    type: AttendanceType.CHECK_IN,
    userId,
    workDate: WORK_DATE,
    latitude: -6.2,
    longitude: 106.8,
    photoUrl: `/api/images/${userId}.jpg`,
    distanceMeters: 1500,
    accuracyMeters: 10,
    isWithinRadius: false,
    isLate: false,
    lateMinutes: 0,
    workMode: WorkMode.LUAR_RADIUS,
    workModeDetail: "Ke klien",
    approvalStatus: AttendanceApproval.PENDING,
  });

const reload = async (user: User) => (await UserService.getById(user.id))!;

async function pendingNamesFor(reviewer: User) {
  const scope = await ApprovalRoutingService.getScopeForReviewer(await reload(reviewer));
  const items = await AttendanceService.listPendingApprovalForScope(scope);
  return items.map((item) => item.user.name).sort();
}

describe("antrean absen luar radius per Divisi", () => {
  it("Supervisor Divisi melihat absensi Divisinya dan yang tanpa Jabatan, bukan Divisi lain", async () => {
    const spvTeknis = await createUser("SpvTeknis", Role.SUPERVISOR);
    const harry = await createUser("Harry");
    const sinta = await createUser("Sinta");
    const tanpa = await createUser("Tanpa");
    await division("Teknis", [spvTeknis, harry]);
    await division("Keuangan", [sinta]);
    for (const user of [harry, sinta, tanpa]) await pendingOutside(user.id);

    expect(await pendingNamesFor(spvTeknis)).toEqual(["Harry", "Tanpa"]);
  });

  it("Manager melihat absensi Supervisor dan Divisi tanpa Supervisor Divisi aktif", async () => {
    const manager = await createUser("Manager", Role.MANAGER);
    const spvTeknis = await createUser("SpvTeknis", Role.SUPERVISOR);
    const harry = await createUser("Harry");
    const sinta = await createUser("Sinta");
    const tanpa = await createUser("Tanpa");
    await division("Teknis", [spvTeknis, harry]);
    await division("Keuangan", [sinta]);
    for (const user of [spvTeknis, harry, sinta, tanpa]) await pendingOutside(user.id);

    expect(await pendingNamesFor(manager)).toEqual(["Sinta", "SpvTeknis"]);
  });

  it("Supervisor tanpa Jabatan tetap melihat semua absensi tahap Supervisor (perilaku lama)", async () => {
    const spvLama = await createUser("SpvLama", Role.SUPERVISOR);
    const spvTeknis = await createUser("SpvTeknis", Role.SUPERVISOR);
    const harry = await createUser("Harry");
    const sinta = await createUser("Sinta");
    await division("Teknis", [spvTeknis, harry]);
    await division("Keuangan", [sinta]);
    for (const user of [spvTeknis, harry, sinta]) await pendingOutside(user.id);

    expect(await pendingNamesFor(spvLama)).toEqual(["Harry", "Sinta"]);
  });

  it("antrean lama yang tercatat sebelum Jabatan diisi terbagi sendiri ke Supervisor Divisi, badge ikut", async () => {
    const spvTeknis = await createUser("SpvTeknis", Role.SUPERVISOR);
    const spvKeuangan = await createUser("SpvKeuangan", Role.SUPERVISOR);
    const harry = await createUser("Harry");
    const sinta = await createUser("Sinta");
    for (const user of [harry, sinta]) await pendingOutside(user.id);

    expect(await pendingNamesFor(spvTeknis)).toEqual(["Harry", "Sinta"]);

    await division("Teknis", [spvTeknis, harry]);
    await division("Keuangan", [spvKeuangan, sinta]);

    expect(await pendingNamesFor(spvTeknis)).toEqual(["Harry"]);
    expect(await pendingNamesFor(spvKeuangan)).toEqual(["Sinta"]);

    const scope = await ApprovalRoutingService.getScopeForReviewer(await reload(spvTeknis));
    expect(await AttendanceService.countPendingApprovalForScope(scope)).toBe(1);
  });
});

describe("hak memutuskan absen luar radius per Divisi", () => {
  async function canDecide(reviewer: User, owner: User) {
    const attendance = await pendingOutside(owner.id);
    const loaded = (await AttendanceService.getById(attendance.id))!;
    return ApprovalRoutingService.canReviewAttendance(await reload(reviewer), loaded);
  }

  it("Supervisor Divisi tidak bisa memutuskan absensi Divisi lain", async () => {
    const spvTeknis = await createUser("SpvTeknis", Role.SUPERVISOR);
    const harry = await createUser("Harry");
    const sinta = await createUser("Sinta");
    const tanpa = await createUser("Tanpa");
    await division("Teknis", [spvTeknis, harry]);
    await division("Keuangan", [sinta]);

    expect(await canDecide(spvTeknis, harry)).toBe(true);
    expect(await canDecide(spvTeknis, tanpa)).toBe(true);
    expect(await canDecide(spvTeknis, sinta)).toBe(false);
  });

  it("Manager hanya memutuskan absensi Supervisor dan Divisi tanpa Supervisor Divisi aktif", async () => {
    const manager = await createUser("Manager", Role.MANAGER);
    const spvTeknis = await createUser("SpvTeknis", Role.SUPERVISOR);
    const harry = await createUser("Harry");
    const sinta = await createUser("Sinta");
    await division("Teknis", [spvTeknis, harry]);
    await division("Keuangan", [sinta]);

    expect(await canDecide(manager, spvTeknis)).toBe(true);
    expect(await canDecide(manager, sinta)).toBe(true);
    expect(await canDecide(manager, harry)).toBe(false);
  });

  it("Admin memutuskan absensi Divisi mana pun, tapi tidak ada yang memutuskan absensinya sendiri", async () => {
    const admin = await createUser("Admin", Role.ADMIN);
    const spvTeknis = await createUser("SpvTeknis", Role.SUPERVISOR);
    const sinta = await createUser("Sinta");
    await division("Teknis", [spvTeknis]);
    await division("Keuangan", [sinta]);

    expect(await canDecide(admin, sinta)).toBe(true);
    expect(await canDecide(admin, admin)).toBe(false);
  });
});

describe("setujui semua absen luar radius", () => {
  it("Supervisor Divisi hanya menyetujui antrean dalam cakupannya", async () => {
    const spvTeknis = await createUser("SpvTeknis", Role.SUPERVISOR);
    const harry = await createUser("Harry");
    const sinta = await createUser("Sinta");
    await division("Teknis", [spvTeknis, harry]);
    await division("Keuangan", [sinta]);
    for (const user of [harry, sinta]) await pendingOutside(user.id);

    const scope = await ApprovalRoutingService.getScopeForReviewer(await reload(spvTeknis));
    const approved = await AttendanceService.approveAllPending({
      scope,
      excludeUserId: spvTeknis.id,
      reviewedById: spvTeknis.id,
      reviewNote: "Disetujui massal",
    });

    expect(approved).toBe(1);
    const spvLama = await createUser("SpvLama", Role.SUPERVISOR);
    expect(await pendingNamesFor(spvLama)).toEqual(["Sinta"]);
  });
});
