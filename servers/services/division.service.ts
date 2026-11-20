import prisma, { type Db } from "@/lib/prisma";
import type { PositionGroup } from "@/lib/division";
import type {
  AssignPositionDTO,
  DivisionDTO,
  PositionDTO,
} from "../validators/division.validator";

/** Hasil hapus yang ditolak karena masih ada isinya. */
export type DeleteOutcome =
  | { deleted: true }
  | { deleted: false; blockers: number };

/**
 * Master data Divisi & Jabatan (ADR 0001). Satu-satunya tempat yang menjaga
 * `User.position` (teks, dibaca mobile versi lama) tetap sama dengan nama
 * Jabatan pemegangnya — setiap perubahan `positionId` atau nama Jabatan
 * menyalinnya dalam transaksi yang sama.
 */
export const DivisionService = {
  /** Bahan mentah pohon `/admin/divisi` — dirakit `buildDivisionTree()`. */
  async listStructure() {
    const [divisions, positions, users] = await prisma.$transaction([
      prisma.division.findMany({ select: { id: true, name: true } }),
      prisma.position.findMany({
        select: { id: true, name: true, divisionId: true },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          positionId: true,
        },
      }),
    ]);

    return { divisions, positions, users };
  },

  /** Pilihan Jabatan dikelompokkan per Divisi — dipakai dropdown form pekerja & graph. */
  async listPositionGroups(): Promise<PositionGroup[]> {
    const divisions = await prisma.division.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        positions: {
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        },
      },
    });

    return divisions.map((division) => ({
      divisionId: division.id,
      divisionName: division.name,
      positions: division.positions,
    }));
  },

  async getPositionById(id: string) {
    return prisma.position.findUnique({
      where: { id },
      include: { division: true },
    });
  },

  async createDivision(data: DivisionDTO, db?: Db) {
    return (db ?? prisma).division.create({ data: { name: data.name } });
  },

  async renameDivision(id: string, data: DivisionDTO) {
    return prisma.division.update({ where: { id }, data: { name: data.name } });
  },

  /** Ditolak selama Divisi masih punya Jabatan. */
  async deleteDivision(id: string): Promise<DeleteOutcome> {
    return prisma.$transaction(async (tx) => {
      const blockers = await tx.position.count({ where: { divisionId: id } });
      if (blockers > 0) return { deleted: false, blockers };

      await tx.division.delete({ where: { id } });
      return { deleted: true };
    });
  },

  async createPosition(data: PositionDTO, db?: Db) {
    return (db ?? prisma).position.create({
      data: { name: data.name, divisionId: data.divisionId },
    });
  },

  /** Ganti nama Jabatan sekaligus kolom teks jabatan semua pemegangnya. */
  async renamePosition(id: string, { name }: Pick<PositionDTO, "name">) {
    return prisma.$transaction(async (tx) => {
      const position = await tx.position.update({
        where: { id },
        data: { name },
      });
      await tx.user.updateMany({
        where: { positionId: id },
        data: { position: name },
      });
      return position;
    });
  },

  /** Ditolak selama Jabatan masih dipegang siapa pun (termasuk akun nonaktif). */
  async deletePosition(id: string): Promise<DeleteOutcome> {
    return prisma.$transaction(async (tx) => {
      const blockers = await tx.user.count({ where: { positionId: id } });
      if (blockers > 0) return { deleted: false, blockers };

      await tx.position.delete({ where: { id } });
      return { deleted: true };
    });
  },

  /**
   * Set Jabatan seseorang langsung, tanpa approval. `positionId` null
   * mengosongkan Jabatan dan membiarkan kolom teks apa adanya. Dengan `db`
   * (transaksi pemanggil), ditulis di transaksi itu.
   */
  async assignPosition({ userId, positionId }: AssignPositionDTO, db?: Db) {
    if (positionId === null) {
      return (db ?? prisma).user.update({
        where: { id: userId },
        data: { positionId: null },
      });
    }

    const write = async (tx: Db) => {
      const position = await tx.position.findUniqueOrThrow({
        where: { id: positionId },
        select: { name: true },
      });
      return tx.user.update({
        where: { id: userId },
        data: { positionId, position: position.name },
      });
    };

    return db ? write(db) : prisma.$transaction(write);
  },
};
