import prisma from "@/lib/prisma";
import { AccountRequestStatus } from "@/generated/prisma";

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
