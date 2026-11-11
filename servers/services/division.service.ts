import prisma from "@/lib/prisma";
import {
  CreateDivisionDTO,
  UpdateDivisionDTO,
  CreatePositionDTO,
  UpdatePositionDTO,
} from "../validators/division.validator";

export const DivisionService = {
  /** Semua divisi beserta daftar posisi dan jumlah karyawan di dalamnya. */
  async list() {
    return prisma.division.findMany({
      orderBy: { name: "asc" },
      include: {
        positions: {
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: { users: true },
            },
          },
        },
        _count: {
          select: { users: true, positions: true },
        },
      },
    });
  },

  async getById(id: string) {
    return prisma.division.findUnique({
      where: { id },
      include: {
        positions: {
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: { users: true },
            },
          },
        },
        _count: {
          select: { users: true, positions: true },
        },
      },
    });
  },

  async getByName(name: string) {
    return prisma.division.findUnique({
      where: { name },
    });
  },

  async create(data: CreateDivisionDTO) {
    return prisma.division.create({
      data: {
        name: data.name.trim(),
      },
    });
  },

  async update(id: string, data: UpdateDivisionDTO) {
    return prisma.division.update({
      where: { id },
      data: {
        name: data.name.trim(),
      },
    });
  },

  async delete(id: string) {
    const division = await prisma.division.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, positions: true },
        },
      },
    });

    if (!division) {
      throw new Error("Divisi tidak ditemukan");
    }

    if (division._count.users > 0) {
      throw new Error(
        `Tidak dapat menghapus divisi '${division.name}' karena masih memiliki ${division._count.users} karyawan terdaftar.`
      );
    }

    return prisma.division.delete({
      where: { id },
    });
  },

  // --- POSITION OPERATIONS ---

  async listPositions(divisionId?: string) {
    return prisma.position.findMany({
      where: divisionId ? { divisionId } : undefined,
      orderBy: [{ division: { name: "asc" } }, { name: "asc" }],
      include: {
        division: true,
        _count: {
          select: { users: true },
        },
      },
    });
  },

  async getPositionById(id: string) {
    return prisma.position.findUnique({
      where: { id },
      include: {
        division: true,
        _count: {
          select: { users: true },
        },
      },
    });
  },

  async createPosition(data: CreatePositionDTO) {
    return prisma.position.create({
      data: {
        name: data.name.trim(),
        divisionId: data.divisionId,
      },
    });
  },

  async updatePosition(id: string, data: UpdatePositionDTO) {
    return prisma.position.update({
      where: { id },
      data: {
        name: data.name.trim(),
        divisionId: data.divisionId,
      },
    });
  },

  async deletePosition(id: string) {
    const position = await prisma.position.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!position) {
      throw new Error("Jabatan tidak ditemukan");
    }

    if (position._count.users > 0) {
      throw new Error(
        `Tidak dapat menghapus jabatan '${position.name}' karena masih memiliki ${position._count.users} karyawan terdaftar.`
      );
    }

    return prisma.position.delete({
      where: { id },
    });
  },
};

