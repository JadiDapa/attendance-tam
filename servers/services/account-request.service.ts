import prisma from "@/lib/prisma";
import { AccountRequestStatus, Role } from "@/generated/prisma";

export const AccountRequestService = {
  /** Antrean admin di /admin/permintaan-akun — sama seperti approval lain, hanya yang PENDING. */
  async listPending() {
    return prisma.accountRequest.findMany({
      where: { status: AccountRequestStatus.PENDING },
      orderBy: { createdAt: "asc" },
    });
  },

  async countPending() {
    return prisma.accountRequest.count({
      where: { status: AccountRequestStatus.PENDING },
    });
  },

  async getById(id: string) {
    return prisma.accountRequest.findUnique({ where: { id } });
  },

  /** Dicek saat pemohon submit — permintaan yang masih PENDING dengan email yang sama tidak boleh dobel. */
  async findPendingByEmail(email: string) {
    return prisma.accountRequest.findFirst({
      where: { email, status: AccountRequestStatus.PENDING },
    });
  },

  async create(data: {
    name: string;
    email: string;
    phone: string | null;
    passwordEncrypted: string;
    role?: Role;
  }) {
    return prisma.accountRequest.create({ data });
  },

  async markApproved(id: string, reviewedById: string) {
    return prisma.accountRequest.update({
      where: { id },
      data: {
        status: AccountRequestStatus.APPROVED,
        reviewedById,
        reviewedAt: new Date(),
        // Sudah tidak dibutuhkan lagi setelah akun Clerk dibuat — jangan
        // menyimpan password lebih lama dari yang perlu.
        passwordEncrypted: null,
      },
    });
  },

  async markRejected(
    id: string,
    reviewedById: string,
    reviewNote: string | null,
  ) {
    return prisma.accountRequest.update({
      where: { id },
      data: {
        status: AccountRequestStatus.REJECTED,
        reviewedById,
        reviewedAt: new Date(),
        reviewNote,
        passwordEncrypted: null,
      },
    });
  },
};
