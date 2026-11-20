import { describe, expect, it } from "vitest";

import {
  buildDivisionTree,
  canHavePosition,
  formatWorkerPosition,
  normalizePositionId,
  NO_POSITION,
  type OrgDivision,
  type OrgPosition,
  type OrgUser,
} from "@/lib/division";

/** Struktur awal sesuai pemetaan produksi (spec §Pemetaan Divisi). */
const DIVISIONS: OrgDivision[] = [
  { id: "div-teknis", name: "Teknis" },
  { id: "div-admin", name: "Admin" },
];

const POSITIONS: OrgPosition[] = [
  { id: "pos-spv-admin", name: "Supervisor Admin", divisionId: "div-admin" },
  { id: "pos-admin", name: "Admin", divisionId: "div-admin" },
  { id: "pos-spv-teknis", name: "Supervisor Teknis", divisionId: "div-teknis" },
  { id: "pos-teknisi", name: "Teknisi", divisionId: "div-teknis" },
];

const user = (
  id: string,
  role: OrgUser["role"],
  positionId: string | null,
  isActive = true,
): OrgUser => ({ id, name: id, role, isActive, positionId });

const SALLY = user("Sally", "SUPERVISOR", "pos-spv-admin");
const SOPIAH = user("Sopiah", "EMPLOYEE", "pos-admin");
const DWIKY = user("Dwiky", "SUPERVISOR", "pos-spv-teknis");
const HARRY = user("Harry", "EMPLOYEE", "pos-teknisi");
const REZA = user("Reza", "MANAGER", null);

const tree = (users: OrgUser[]) =>
  buildDivisionTree({ divisions: DIVISIONS, positions: POSITIONS, users });

const division = (users: OrgUser[], name: string) => {
  const found = tree(users).divisions.find((item) => item.name === name);
  if (!found) throw new Error(`Divisi ${name} tidak ada di pohon`);
  return found;
};

describe("Supervisor Divisi", () => {
  it("Sally adalah Supervisor Divisi Admin, bukan Divisi Teknis", () => {
    const users = [SALLY, SOPIAH, DWIKY, HARRY];

    expect(division(users, "Admin").supervisors.map((u) => u.id)).toEqual([
      "Sally",
    ]);
    expect(division(users, "Teknis").supervisors.map((u) => u.id)).toEqual([
      "Dwiky",
    ]);
  });

  it("Divisi yang Supervisor-nya nonaktif diberi peringatan tanpa supervisor", () => {
    const users = [SALLY, SOPIAH, user("Dwiky", "SUPERVISOR", "pos-spv-teknis", false), HARRY];

    expect(division(users, "Teknis").supervisors).toEqual([]);
    expect(division(users, "Teknis").hasSupervisor).toBe(false);
    expect(division(users, "Admin").hasSupervisor).toBe(true);
  });
});

describe("Jabatan dan pemegangnya", () => {
  it("Divisi dan Jabatan diurutkan menurut nama", () => {
    const result = tree([SALLY, SOPIAH, DWIKY, HARRY]);

    expect(result.divisions.map((d) => d.name)).toEqual(["Admin", "Teknis"]);
    expect(division([], "Teknis").positions.map((p) => p.name)).toEqual([
      "Supervisor Teknis",
      "Teknisi",
    ]);
  });

  it("pemegang nonaktif tidak tampil, tapi dihitung karena Jabatan tidak bisa dihapus selama dipegang", () => {
    const users = [HARRY, user("Mantan Teknisi", "EMPLOYEE", "pos-teknisi", false)];
    const teknisi = division(users, "Teknis").positions.find(
      (p) => p.name === "Teknisi",
    );

    expect(teknisi?.holders.map((u) => u.id)).toEqual(["Harry"]);
    expect(teknisi?.inactiveHolderCount).toBe(1);
  });
});

describe("puncak pohon dan Belum punya Jabatan", () => {
  const ADMINISTRATOR = user("Administrator", "ADMIN", null);
  const TES_DIKA = user("tes-dika-1", "EMPLOYEE", null);
  const NONAKTIF = user("Akun Lama", "EMPLOYEE", null, false);
  const MANAGER_LAMA = user("Manager Lama", "MANAGER", null, false);

  const users = [SALLY, REZA, MANAGER_LAMA, ADMINISTRATOR, TES_DIKA, NONAKTIF];

  it("Manager aktif tampil di puncak, tanpa Divisi", () => {
    expect(tree(users).managers.map((u) => u.id)).toEqual(["Reza"]);
  });

  it("Belum punya Jabatan berisi user aktif non-Manager tanpa Jabatan", () => {
    expect(tree(users).unassigned.map((u) => u.id)).toEqual([
      "Administrator",
      "tes-dika-1",
    ]);
  });
});

describe("canHavePosition (ADR 0001: Manager tidak punya Jabatan)", () => {
  it("mengembalikan false untuk MANAGER", () => {
    expect(canHavePosition("MANAGER")).toBe(false);
  });

  it("mengembalikan true untuk role lain atau kosong", () => {
    expect(canHavePosition("EMPLOYEE")).toBe(true);
    expect(canHavePosition("SUPERVISOR")).toBe(true);
    expect(canHavePosition("ADMIN")).toBe(true);
    expect(canHavePosition(null)).toBe(true);
    expect(canHavePosition(undefined)).toBe(true);
  });
});

describe("formatWorkerPosition (tabel daftar pekerja)", () => {
  it("menampilkan Jabatan + Divisi jika keduanya ada", () => {
    expect(formatWorkerPosition("Teknisi", "Teknis")).toBe("Teknisi · Divisi Teknis");
  });

  it("menampilkan teks Jabatan saja jika tidak punya Divisi (mis. Manager)", () => {
    expect(formatWorkerPosition("Business Development Manager", null)).toBe(
      "Business Development Manager",
    );
  });

  it("menampilkan Tanpa jabatan jika Jabatan kosong atau null", () => {
    expect(formatWorkerPosition(null, null)).toBe("Tanpa jabatan");
    expect(formatWorkerPosition("", null)).toBe("Tanpa jabatan");
    expect(formatWorkerPosition(undefined, undefined)).toBe("Tanpa jabatan");
  });
});

describe("normalizePositionId (form pekerja & graph)", () => {
  it("mengembalikan id jabatan bila valid", () => {
    expect(normalizePositionId("pos_123")).toBe("pos_123");
    expect(normalizePositionId("  pos_123  ")).toBe("pos_123");
  });

  it("mengembalikan null untuk NO_POSITION, string kosong, atau null/undefined", () => {
    expect(normalizePositionId(NO_POSITION)).toBeNull();
    expect(normalizePositionId("")).toBeNull();
    expect(normalizePositionId("   ")).toBeNull();
    expect(normalizePositionId(null)).toBeNull();
    expect(normalizePositionId(undefined)).toBeNull();
  });
});
