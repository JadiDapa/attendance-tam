import prisma from "@/lib/prisma";
import { Prisma, Role } from "@/generated/prisma";

export type UserListOptions = {
  role?: Role;
  isActive?: boolean;
  search?: string;
  /** Batasi ke satu user — dipakai laporan yang difilter per karyawan. */
  id?: string;
};

function userWhere(opts: UserListOptions): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [];

  if (opts.id) and.push({ id: opts.id });
  if (opts.role) and.push({ role: opts.role });
  if (opts.isActive !== undefined) and.push({ isActive: opts.isActive });
  if (opts.search) {
    and.push({
      OR: [
        { name: { contains: opts.search, mode: "insensitive" } },
        { email: { contains: opts.search, mode: "insensitive" } },
      ],
    });
  }

  return and.length ? { AND: and } : {};
}

export const UserService = {
  async list(opts: UserListOptions = {}) {
    return prisma.user.findMany({
      where: userWhere(opts),
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  },

  async getById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async getByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  },

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },

  async setActive(id: string, isActive: boolean) {
    return prisma.user.update({ where: { id }, data: { isActive } });
  },
};
