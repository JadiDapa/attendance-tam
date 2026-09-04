import prisma from "@/lib/prisma";
import { LeaveStatus, Prisma } from "@/generated/prisma";
import { CreateLeaveDTO } from "../validators/leave.validator";

export type LeaveListOptions = {
  userId?: string;
  status?: LeaveStatus;
};

function leaveWhere(opts: LeaveListOptions): Prisma.LeaveRequestWhereInput {
  const and: Prisma.LeaveRequestWhereInput[] = [];

  if (opts.userId) and.push({ userId: opts.userId });
  if (opts.status) and.push({ status: opts.status });

  return and.length ? { AND: and } : {};
}

export const LeaveService = {
  async list(opts: LeaveListOptions = {}) {
    return prisma.leaveRequest.findMany({
      where: leaveWhere(opts),
      orderBy: { createdAt: "desc" },
      include: { user: true, reviewedBy: true },
    });
  },

  async getById(id: string) {
    return prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true, reviewedBy: true },
    });
  },

  /** Cari pengajuan lewat URL lampiran — dipakai untuk cek kepemilikan saat serve file. */
  async findByAttachmentUrl(attachmentUrl: string) {
    return prisma.leaveRequest.findFirst({
      where: { attachmentUrl },
      select: { userId: true },
    });
  },

  async countPending() {
    return prisma.leaveRequest.count({
      where: { status: LeaveStatus.PENDING },
    });
  },

  /** Batalkan pengajuan sendiri selama belum di-review admin. */
  async cancelOwn(id: string, userId: string): Promise<boolean> {
    const { count } = await prisma.leaveRequest.deleteMany({
      where: { id, userId, status: LeaveStatus.PENDING },
    });

    return count > 0;
  },

  async create(data: CreateLeaveDTO) {
    return prisma.leaveRequest.create({ data });
  },

  /**
   * Cek tabrakan tanggal lalu buat pengajuan dalam satu transaksi
   * Serializable, supaya dua submit hampir bersamaan (double-click, dua tab)
   * tidak bisa sama-sama lolos cek lalu membuat baris yang tumpang tindih —
   * beda dari `findOverlapping` + `create` terpisah yang punya celah race.
   */
  async createIfNotOverlapping(data: CreateLeaveDTO) {
    return prisma.$transaction(
      async (tx) => {
        const overlapping = await tx.leaveRequest.findFirst({
          where: {
            userId: data.userId,
            status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
            startDate: { lte: data.endDate },
            endDate: { gte: data.startDate },
          },
        });

        if (overlapping) return { ok: false as const, overlapping };

        const leave = await tx.leaveRequest.create({ data });

        return { ok: true as const, leave };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  },

  /**
   * Setujui/tolak pengajuan. Hanya berlaku kalau statusnya masih PENDING,
   * sehingga dua admin tidak bisa memproses pengajuan yang sama dua kali.
   */
  async review(
    id: string,
    data: {
      status: LeaveStatus;
      reviewedById: string;
      reviewNote: string | null;
    },
  ) {
    const { count } = await prisma.leaveRequest.updateMany({
      where: { id, status: LeaveStatus.PENDING },
      data: { ...data, reviewedAt: new Date() },
    });

    return count;
  },

  /** Izin disetujui yang bersinggungan dengan rentang tanggal (untuk laporan). */
  async listApprovedInRange(range: {
    startDate: Date;
    endDate: Date;
    userId?: string;
  }) {
    return prisma.leaveRequest.findMany({
      where: {
        status: LeaveStatus.APPROVED,
        startDate: { lte: range.endDate },
        endDate: { gte: range.startDate },
        ...(range.userId ? { userId: range.userId } : {}),
      },
    });
  },

  /** Izin yang sudah disetujui dan mencakup tanggal tertentu. */
  async listApprovedOnDate(date: Date) {
    return prisma.leaveRequest.findMany({
      where: {
        status: LeaveStatus.APPROVED,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      include: { user: true },
    });
  },

  /**
   * Pengajuan lain milik user yang rentang tanggalnya bertabrakan dan belum
   * ditolak — dipakai untuk mencegah pengajuan dobel.
   */
  async findOverlapping(userId: string, startDate: Date, endDate: Date) {
    return prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
  },
};
