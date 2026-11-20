import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma";
import { DivisionService } from "@/servers/services/division.service";
import { FieldAssignmentService } from "@/servers/services/field-assignment.service";
import { UserService } from "@/servers/services/user.service";

let clerkSeq = 0;

const createUser = (
  name: string,
  extra: { role?: Role; positionId?: string | null; isActive?: boolean } = {},
) =>
  UserService.create({
    clerkId: `user_fa_test_${++clerkSeq}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@test.local`,
    ...extra,
  });

/** Divisi Teknis (Dwiky Supervisor, Harry teknisi) dan Divisi Admin (Ani staf). */
async function organisasi() {
  const teknis = await DivisionService.createDivision({ name: "Teknis" });
  const admin = await DivisionService.createDivision({ name: "Admin" });
  const teknisi = await DivisionService.createPosition({
    name: "Teknisi",
    divisionId: teknis.id,
  });
  const spvTeknis = await DivisionService.createPosition({
    name: "Supervisor Teknis",
    divisionId: teknis.id,
  });
  const stafAdmin = await DivisionService.createPosition({
    name: "Staf Admin",
    divisionId: admin.id,
  });

  const dwiky = await createUser("Dwiky", {
    role: Role.SUPERVISOR,
    positionId: spvTeknis.id,
  });
  const harry = await createUser("Harry", { positionId: teknisi.id });
  const ani = await createUser("Ani", { positionId: stafAdmin.id });

  return { dwiky, harry, ani, teknisi };
}

const names = (users: { name: string }[]) => users.map((user) => user.name);

describe("pilihan karyawan Dinas luar", () => {
  it("Supervisor Divisi hanya melihat karyawan aktif Divisinya sendiri", async () => {
    const { dwiky, teknisi } = await organisasi();
    await createUser("Hery Nonaktif", { positionId: teknisi.id, isActive: false });
    await createUser("Supervisor Lain", {
      role: Role.SUPERVISOR,
      positionId: teknisi.id,
    });
    await createUser("Tanpa Jabatan");

    const employees = await FieldAssignmentService.listAssignableEmployees(dwiky);

    expect(names(employees)).toEqual(["Harry"]);
  });

  it("Supervisor tanpa Jabatan melihat semua karyawan aktif", async () => {
    await organisasi();
    await createUser("Tanpa Jabatan");
    const sally = await createUser("Sally", { role: Role.SUPERVISOR });

    const employees = await FieldAssignmentService.listAssignableEmployees(sally);

    expect(names(employees)).toEqual(["Ani", "Harry", "Tanpa Jabatan"]);
  });
});

describe("Jabatan Supervisor tidak ditemukan (mis. dihapus setelah sesi dimuat)", () => {
  it("gagal tertutup: tidak ada karyawan yang bisa dipilih maupun ditugaskan", async () => {
    const { harry } = await organisasi();
    const basi = { positionId: "jabatan-sudah-dihapus" };

    expect(await FieldAssignmentService.listAssignableEmployees(basi)).toEqual([]);
    expect(await FieldAssignmentService.areAssignable(basi, [harry.id])).toBe(false);
  });
});

describe("validasi server Dinas luar", () => {
  it("menerima anggota Divisi Supervisor", async () => {
    const { dwiky, harry } = await organisasi();

    expect(
      await FieldAssignmentService.areAssignable(dwiky, [harry.id]),
    ).toBe(true);
  });

  it("menolak karyawan di luar Divisi Supervisor walau dikirim lewat API", async () => {
    const { dwiky, harry, ani } = await organisasi();

    expect(
      await FieldAssignmentService.areAssignable(dwiky, [harry.id, ani.id]),
    ).toBe(false);
  });

  it("menolak id yang bukan karyawan aktif", async () => {
    const { harry, teknisi } = await organisasi();
    const sally = await createUser("Sally", { role: Role.SUPERVISOR });
    const nonaktif = await createUser("Nonaktif", {
      positionId: teknisi.id,
      isActive: false,
    });

    expect(await FieldAssignmentService.areAssignable(sally, [harry.id])).toBe(true);
    expect(
      await FieldAssignmentService.areAssignable(sally, [nonaktif.id]),
    ).toBe(false);
    expect(
      await FieldAssignmentService.areAssignable(sally, ["tidak-ada"]),
    ).toBe(false);
  });
});
