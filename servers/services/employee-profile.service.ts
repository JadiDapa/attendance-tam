import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

/**
 * Tujuh bagian profil karyawan — semuanya 1:1 dengan User (`@unique userId`),
 * jadi setiap service cuma butuh getByUserId + upsert. "Belum ada baris"
 * (getByUserId mengembalikan null) itu normal, bukan error — berarti bagian
 * itu belum pernah diisi. `data` yang diterima `upsert` TIDAK menyertakan
 * `userId` — itu selalu diteruskan terpisah lewat parameter pertama.
 */

type Without<T> = Omit<T, "userId" | "user">;

export const PersonalIdentityService = {
  async getByUserId(userId: string) {
    return prisma.personalIdentity.findUnique({ where: { userId } });
  },

  async upsert(
    userId: string,
    data: Without<Prisma.PersonalIdentityUncheckedCreateInput>,
  ) {
    return prisma.personalIdentity.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },
};

export const ContactService = {
  async getByUserId(userId: string) {
    return prisma.contact.findUnique({ where: { userId } });
  },

  async upsert(userId: string, data: Without<Prisma.ContactUncheckedCreateInput>) {
    return prisma.contact.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },
};

export const EmploymentDataService = {
  async getByUserId(userId: string) {
    return prisma.employmentData.findUnique({ where: { userId } });
  },

  /** Dipakai laporan bulanan untuk mengambil NIP banyak karyawan sekaligus. */
  async listByUserIds(userIds: string[]) {
    return prisma.employmentData.findMany({
      where: { userId: { in: userIds } },
    });
  },

  async upsert(
    userId: string,
    data: Without<Prisma.EmploymentDataUncheckedCreateInput>,
  ) {
    return prisma.employmentData.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },
};

export const WorkHistoryService = {
  async listByUserId(userId: string) {
    return prisma.workHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  },

  async create(
    userId: string,
    data: Without<Prisma.WorkHistoryUncheckedCreateInput>,
  ) {
    return prisma.workHistory.create({ data: { userId, ...data } });
  },

  /** `where` disaring dengan `userId` juga supaya tidak bisa mengedit baris user lain lewat id tebakan. */
  async update(
    id: string,
    userId: string,
    data: Without<Prisma.WorkHistoryUncheckedCreateInput>,
  ) {
    const { count } = await prisma.workHistory.updateMany({
      where: { id, userId },
      data,
    });

    return count > 0;
  },

  async remove(id: string, userId: string) {
    const { count } = await prisma.workHistory.deleteMany({
      where: { id, userId },
    });

    return count > 0;
  },
};

export const AdministrativeDocumentService = {
  async getByUserId(userId: string) {
    return prisma.administrativeDocument.findUnique({ where: { userId } });
  },

  /**
   * Caller (action) hanya menyertakan key yang berubah — Prisma memperlakukan
   * `undefined` sebagai "jangan sentuh field ini" baik di `create` maupun
   * `update`, jadi baris baru yang sebagian besar field-nya nullable tetap
   * bisa dibuat walau cuma satu dokumen yang diisi duluan.
   */
  async upsert(
    userId: string,
    data: Partial<Without<Prisma.AdministrativeDocumentUncheckedCreateInput>>,
  ) {
    return prisma.administrativeDocument.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },
};

export const PayrollService = {
  async getByUserId(userId: string) {
    return prisma.payroll.findUnique({ where: { userId } });
  },

  async upsert(userId: string, data: Without<Prisma.PayrollUncheckedCreateInput>) {
    return prisma.payroll.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },
};

export const TrainingService = {
  async listByUserId(userId: string) {
    return prisma.training.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  },

  async create(
    userId: string,
    data: Without<Prisma.TrainingUncheckedCreateInput>,
  ) {
    return prisma.training.create({ data: { userId, ...data } });
  },

  /** `where` disaring dengan `userId` juga supaya tidak bisa mengedit baris user lain lewat id tebakan. */
  async update(
    id: string,
    userId: string,
    data: Without<Prisma.TrainingUncheckedCreateInput>,
  ) {
    const { count } = await prisma.training.updateMany({
      where: { id, userId },
      data,
    });

    return count > 0;
  },

  async remove(id: string, userId: string) {
    const { count } = await prisma.training.deleteMany({
      where: { id, userId },
    });

    return count > 0;
  },
};
