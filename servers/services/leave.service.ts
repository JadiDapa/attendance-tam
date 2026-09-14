import prisma from "@/lib/prisma";
import { LeaveStage, LeaveStatus, Prisma } from "@/generated/prisma";
import { nextLeaveStage } from "@/lib/leave";
import { CreateLeaveDTO } from "../validators/leave.validator";

export type LeaveListOptions = {
  userId?: string;
  status?: LeaveStatus;
  stage?: LeaveStage;
};

function leaveWhere(opts: LeaveListOptions): Prisma.LeaveRequestWhereInput {
  const and: Prisma.LeaveRequestWhereInput[] = [];

  if (opts.userId) and.push({ userId: opts.userId });
  if (opts.status) and.push({ status: opts.status });
  if (opts.stage) and.push({ stage: opts.stage });

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

  /** Jumlah pengajuan yang menunggu giliran `stage` tertentu (default: semua). */
  async countPending(stage?: LeaveStage) {
    return prisma.leaveRequest.count({
      where: { status: LeaveStatus.PENDING, ...(stage ? { stage } : {}) },
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
   * Setujui/tolak pengajuan pada giliran `stage` milik reviewer yang sedang
   * login. Menolak selalu mengakhiri pengajuan (REJECTED, stage DONE).
   * Menyetujui memindahkan giliran ke `nextLeaveStage` — untuk SAKIT itu
   * langsung DONE (APPROVED), untuk IZIN/CUTI berlanjut ke
   * SUPERVISOR lalu MANAGER sebelum akhirnya APPROVED.
   *
   * `updateMany` di-guard dengan `status: PENDING, stage` supaya dua reviewer
   * (atau reviewer yang sama di dua tab) tidak bisa memproses giliran yang
   * sama dua kali, dan supaya reviewer tidak bisa memutuskan giliran yang
   * bukan miliknya (mis. supervisor memutuskan sebelum admin).
   */
  async review(
    id: string,
    data: {
      stage: LeaveStage;
      status: typeof LeaveStatus.APPROVED | typeof LeaveStatus.REJECTED;
      reviewedById: string;
      reviewNote: string | null;
    },
  ) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { type: true },
    });

    if (!leave) return 0;

    const nextStage =
      data.status === LeaveStatus.REJECTED
        ? LeaveStage.DONE
        : nextLeaveStage(leave.type, data.stage);
    const finalStatus =
      data.status === LeaveStatus.REJECTED
        ? LeaveStatus.REJECTED
        : nextStage === LeaveStage.DONE
          ? LeaveStatus.APPROVED
          : LeaveStatus.PENDING;

    const { count } = await prisma.leaveRequest.updateMany({
      where: { id, status: LeaveStatus.PENDING, stage: data.stage },
      data: {
        status: finalStatus,
        stage: nextStage,
        reviewedById: data.reviewedById,
        reviewNote: data.reviewNote,
        reviewedAt: new Date(),
      },
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
