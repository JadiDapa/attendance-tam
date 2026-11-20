import { afterEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma";
import type { MappingEntry } from "@/lib/division-mapping";
import { DivisionMappingService } from "@/servers/services/division-mapping.service";
import { DivisionService } from "@/servers/services/division.service";
import { UserService } from "@/servers/services/user.service";

let clerkSeq = 0;
const createUser = (
  name: string,
  extra: { role?: Role; position?: string; isActive?: boolean } = {},
) =>
  UserService.create({
    clerkId: `user_test_${++clerkSeq}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@test.local`,
    ...extra,
  });

type Created = Awaited<ReturnType<typeof createUser>>;
const entry = (user: Created, jabatan: string): MappingEntry => ({
  userId: user.id,
  email: user.email,
  jabatan,
});

/** Struktur seperti produksi, dengan orang rekaan. */
async function arrangeOrganization() {
  const sari = await createUser("Sari", { role: Role.SUPERVISOR, position: "Supervisor" });
  const dewi = await createUser("Dewi", { position: "Staff Admin" });
  const sopi = await createUser("Sopi", { role: Role.ADMIN, position: "Admin" });
  const dwi = await createUser("Dwi", { role: Role.SUPERVISOR, position: "Supervisor" });
  const tono = await createUser("Tono", { position: "Teknisi" });
  const tini = await createUser("Tini", { position: "Teknisi" });
  const heri = await createUser("Heri", { position: "Teknisi" });
  const dafa = await createUser("Dafa", { position: "Programmer" });
  const keluar = await createUser("Keluar", { position: "Teknisi", isActive: false });
  const administrator = await createUser("Administrator", { role: Role.ADMIN });
  const manager = await createUser("Manager", {
    role: Role.MANAGER,
    position: "Business Development Manager",
  });

  const entries = [
    entry(sari, "Supervisor Admin"),
    entry(dewi, "Admin"),
    entry(sopi, "Admin"),
    entry(dwi, "Supervisor Teknis"),
    entry(tono, "Teknisi"),
    entry(tini, "Teknisi"),
    entry(heri, "Teknisi (EoS)"),
    entry(dafa, "Programmer"),
  ];

  return { sari, dewi, sopi, dwi, tono, tini, heri, dafa, keluar, administrator, manager, entries };
}

/** Isi database yang disentuh skrip, termasuk `updatedAt` supaya "tidak berubah" terlihat. */
async function snapshot() {
  const structure = await DivisionService.listStructure();
  const users = await Promise.all(structure.users.map((user) => UserService.getById(user.id)));
  return {
    divisions: structure.divisions,
    positions: structure.positions,
    users: users.map((user) => ({
      id: user?.id,
      positionId: user?.positionId,
      position: user?.position,
      updatedAt: user?.updatedAt,
    })),
  };
}

const jabatanOf = async (userId: string) => {
  const user = await UserService.getById(userId);
  const position = user?.positionId ? await DivisionService.getPositionById(user.positionId) : null;
  return { text: user?.position, jabatan: position?.name, divisi: position?.division.name };
};

describe("pemetaan Divisi & Jabatan awal", () => {
  it("dry-run tidak menulis; apply membuat struktur & memetakan; apply kedua tidak mengubah apa pun", async () => {
    const org = await arrangeOrganization();
    const before = await snapshot();

    const preview = await DivisionMappingService.preview(org.entries);
    expect(preview).toMatchObject({ ok: true, createDivisions: ["Admin", "Teknis"] });
    expect(preview.ok && preview.assignments).toHaveLength(8);
    expect(await snapshot()).toEqual(before);

    const first = await DivisionMappingService.apply(org.entries);
    expect(first).toMatchObject({ ok: true, assigned: 8, remaining: 0 });

    expect(await jabatanOf(org.sari.id)).toEqual({ text: "Supervisor Admin", jabatan: "Supervisor Admin", divisi: "Admin" });
    expect(await jabatanOf(org.sopi.id)).toEqual({ text: "Admin", jabatan: "Admin", divisi: "Admin" });
    expect(await jabatanOf(org.tini.id)).toEqual({ text: "Teknisi", jabatan: "Teknisi", divisi: "Teknis" });
    expect(await jabatanOf(org.heri.id)).toEqual({ text: "Teknisi (EoS)", jabatan: "Teknisi (EoS)", divisi: "Teknis" });
    expect(await jabatanOf(org.dafa.id)).toEqual({ text: "Programmer", jabatan: "Programmer", divisi: "Teknis" });
    for (const untouched of [org.keluar, org.administrator, org.manager]) {
      expect((await UserService.getById(untouched.id))?.positionId).toBeNull();
    }
    expect((await UserService.getById(org.manager.id))?.position).toBe("Business Development Manager");

    const afterFirst = await snapshot();
    const second = await DivisionMappingService.apply(org.entries);
    expect(second).toMatchObject({
      ok: true,
      createDivisions: [],
      createPositions: [],
      assignments: [],
      assigned: 0,
      remaining: 0,
    });
    expect(second.ok && second.skipped).toHaveLength(8);
    expect(await snapshot()).toEqual(afterFirst);
  });
});

describe("berhenti total tanpa menulis apa pun", () => {
  it.each<[string, (org: Awaited<ReturnType<typeof arrangeOrganization>>) => Promise<MappingEntry[]>, RegExp]>([
    [
      "email tidak cocok dengan id",
      async ({ entries }) => [...entries.slice(1), { ...entries[0], email: "salah@test.local" }],
      /email tidak cocok/,
    ],
    [
      "Supervisor Admin bukan Role SUPERVISOR",
      async ({ sari, entries }) => {
        await UserService.update(sari.id, { role: Role.EMPLOYEE });
        return entries;
      },
      /ber-Role EMPLOYEE, padahal Supervisor Admin diduga SUPERVISOR/,
    ],
    [
      "user sudah memegang Jabatan lain",
      async ({ dafa, entries }) => {
        const division = await DivisionService.createDivision({ name: "Teknis" });
        const teknisi = await DivisionService.createPosition({ name: "Teknisi", divisionId: division.id });
        await DivisionService.assignPosition({ userId: dafa.id, positionId: teknisi.id });
        return entries;
      },
      /sudah memegang Jabatan lain \(Teknisi · Divisi Teknis\), bukan Programmer/,
    ],
    [
      "user aktif berteks \"Teknisi\" tidak ada di file (snapshot usang)",
      async ({ tini, entries }) => entries.filter((e) => e.userId !== tini.id),
      /Tini \(.+\) aktif berteks jabatan "Teknisi" tapi tidak ada di file pemetaan/,
    ],
  ])("%s", async (_, arrange, message) => {
    const org = await arrangeOrganization();
    const entries = await arrange(org);
    const before = await snapshot();

    const result = await DivisionMappingService.apply(entries);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(message);
    expect(await snapshot()).toEqual(before);
  });
});

describe("pemetaan yang tidak tuntas dibatalkan seluruhnya", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sisa pemetaan > 0 sesudah apply → transaksi di-rollback, struktur pun tidak tertulis", async () => {
    const org = await arrangeOrganization();
    const before = await snapshot();
    // Tiru penulisan Jabatan yang diam-diam tidak terjadi.
    vi.spyOn(DivisionService, "assignPosition").mockResolvedValue(
      undefined as never,
    );

    await expect(DivisionMappingService.apply(org.entries)).rejects.toThrow(/tidak tuntas/);

    expect(await snapshot()).toEqual(before);
  });
});
