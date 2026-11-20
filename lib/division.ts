/**
 * Struktur organisasi untuk halaman graph Divisi (`/admin/divisi`). Bebas
 * Prisma: menerima data mentah, mengembalikan pohon Manager → Divisi →
 * Jabatan → orang. Divisi seseorang selalu dibaca lewat Jabatannya (ADR 0001).
 */

export type OrgRole = "EMPLOYEE" | "ADMIN" | "SUPERVISOR" | "MANAGER";

export type OrgUser = {
  id: string;
  name: string;
  role: OrgRole;
  isActive: boolean;
  positionId: string | null;
};

export type OrgDivision = { id: string; name: string };

export type OrgPosition = { id: string; name: string; divisionId: string };

export type PositionNode<U extends OrgUser = OrgUser> = OrgPosition & {
  /** Pemegang aktif, urut nama. */
  holders: U[];
  /** Pemegang nonaktif tidak ditampilkan, tapi tetap menahan Jabatan dari dihapus. */
  inactiveHolderCount: number;
};

export type DivisionNode<U extends OrgUser = OrgUser> = OrgDivision & {
  /** Supervisor Divisi: Role Supervisor aktif dengan Jabatan di Divisi ini. */
  supervisors: U[];
  /** False → Pengajuan Divisi ini sedang naik ke Manager; tampilkan peringatan. */
  hasSupervisor: boolean;
  positions: PositionNode<U>[];
};

/** Generik atas `U` supaya field tambahan (mis. email) ikut terbawa ke UI. */
export type DivisionTree<U extends OrgUser = OrgUser> = {
  /** Manager aktif — di puncak pohon, di atas semua Divisi. */
  managers: U[];
  divisions: DivisionNode<U>[];
  /** "Belum punya Jabatan": user aktif non-Manager tanpa Jabatan. */
  unassigned: U[];
};

/**
 * Manager tidak punya Jabatan maupun Divisi (ADR 0001).
 * Role lain (EMPLOYEE, ADMIN, SUPERVISOR) boleh memiliki Jabatan.
 */
export function canHavePosition(role?: string | null): boolean {
  return role !== "MANAGER";
}

/**
 * Satu-satunya definisi Supervisor Divisi: Role Supervisor aktif yang punya
 * Jabatan. Divisinya adalah Divisi Jabatan itu (ADR 0001).
 */
export function isDivisionSupervisor(user: OrgUser): boolean {
  return user.isActive && user.role === "SUPERVISOR" && user.positionId !== null;
}

const byName = <T extends { name: string }>(a: T, b: T) =>
  a.name.localeCompare(b.name, "id");

export function buildDivisionTree<U extends OrgUser>(input: {
  divisions: OrgDivision[];
  positions: OrgPosition[];
  users: U[];
}): DivisionTree<U> {
  const holdersOf = (positionId: string) =>
    input.users.filter((user) => user.positionId === positionId);

  const activeUsers = input.users.filter((user) => user.isActive);

  return {
    managers: activeUsers
      .filter((user) => user.role === "MANAGER")
      .sort(byName),
    divisions: [...input.divisions].sort(byName).map((division) => {
      const positions: PositionNode<U>[] = input.positions
        .filter((position) => position.divisionId === division.id)
        .sort(byName)
        .map((position) => {
          const holders = holdersOf(position.id);

          return {
            ...position,
            holders: holders.filter((user) => user.isActive).sort(byName),
            inactiveHolderCount: holders.filter((user) => !user.isActive).length,
          };
        });

      const supervisors = positions
        .flatMap((position) => position.holders)
        .filter(isDivisionSupervisor)
        .sort(byName);

      return {
        ...division,
        supervisors,
        hasSupervisor: supervisors.length > 0,
        positions,
      };
    }),
    unassigned: activeUsers
      .filter((user) => user.role !== "MANAGER" && user.positionId === null)
      .sort(byName),
  };
}

/** Pilihan Jabatan untuk dropdown form pekerja & graph, dikelompokkan per Divisi. */
export type PositionGroup = {
  divisionId: string;
  divisionName: string;
  positions: { id: string; name: string }[];
};

/** Nilai penanda untuk mengosongkan / tanpa Jabatan di Select Radix UI. */
export const NO_POSITION = "__none__";

/** Normalisasi input positionId dari form pekerja & graph. */
export function normalizePositionId(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === NO_POSITION) return null;
  return trimmed;
}

/**
 * Format teks Jabatan + Divisi untuk tabel pekerja.
 * Bila ada Divisi: "Teknisi · Divisi Teknis".
 * Bila tanpa Divisi (mis. akun tanpa Divisi atau teks jabatan manual): "Business Development Manager".
 * Bila kosong: "Tanpa jabatan".
 */
export function formatWorkerPosition(
  position?: string | null,
  divisionName?: string | null,
): string {
  const trimmed = position?.trim();
  if (!trimmed) return "Tanpa jabatan";
  if (!divisionName?.trim()) return trimmed;
  return `${trimmed} · Divisi ${divisionName.trim()}`;
}

