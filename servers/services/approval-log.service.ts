import prisma from "@/lib/prisma";
import { ApprovalLogType, AttendanceApproval, Role } from "@/generated/prisma";

export type RecordApprovalLogInput = {
  type: ApprovalLogType;
  requestId: string;
  reviewerId: string;
  stage: Role;
  status: typeof AttendanceApproval.APPROVED | typeof AttendanceApproval.REJECTED;
  note: string | null;
  requesterId: string;
  requesterName: string;
  summary: string;
};

export const ApprovalLogService = {
  /**
   * Satu baris per keputusan approve/reject di tiap tahapan — dipanggil
   * setelah `updateMany` pada tabel asal berhasil (count > 0), supaya tidak
   * ada log untuk keputusan yang gagal (mis. giliran sudah diambil reviewer
   * lain). Lihat komentar model `ApprovalLog` di schema.prisma.
   */
  async record(data: RecordApprovalLogInput) {
    return prisma.approvalLog.create({ data });
  },

  /** Riwayat keputusan reviewer yang sedang login, terbaru dulu. */
  async listForReviewer(reviewerId: string, type?: ApprovalLogType) {
    return prisma.approvalLog.findMany({
      where: { reviewerId, ...(type ? { type } : {}) },
      orderBy: { reviewedAt: "desc" },
    });
  },
};
