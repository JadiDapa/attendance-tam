import prisma from "@/lib/prisma";
import { LeaveStage, LeaveStatus, Prisma, Role } from "@/generated/prisma";
import type { ApprovalScope } from "@/lib/approval-routing";
import {
  ApprovalRoutingService,
  buildLeaveWhereForScope,
  buildLeaveWhereForViewer,
} from "./approval-routing.service";
import { CreateLeaveDTO } from "../validators/leave.validator";

/** `CreateLeaveDTO` plus giliran approval awal — lihat `resolveInitialLeaveStage`
 * di `lib/leave.ts`, satu-satunya tempat yang tahu cara menghitungnya. */
type CreateLeaveData = CreateLeaveDTO & {
  stage: LeaveStage;
  status: LeaveStatus;
  reviewNote?: string | null;
  reviewedAt?: Date | null;
};

export type LeaveListOptions = {
  userId?: string;
  status?: LeaveStatus;
  stage?: LeaveStage;
  scope?: ApprovalScope;
  where?: Prisma.LeaveRequestWhereInput;
};

function leaveWhere(opts: LeaveListOptions): Prisma.LeaveRequestWhereInput {
  const and: Prisma.LeaveRequestWhereInput[] = [];

  if (opts.userId) and.push({ userId: opts.userId });
  if (opts.status) and.push({ status: opts.status });
  if (opts.stage) and.push({ stage: opts.stage });
  if (opts.scope) and.push(buildLeaveWhereForScope(opts.scope));
  if (opts.where) and.push(opts.where);

  return and.length ? { AND: and } : {};
}

export const LeaveService = {
  async list(opts: LeaveListOptions = {}) {
    return prisma.leaveRequest.findMany({
      where: leaveWhere(opts),
      orderBy: { createdAt: "desc" },
      include: {
        user: { include: { jobPosition: true } },
        reviewedBy: true,
      },
    });
  },

  async getById(id: string) {
    return prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: { include: { jobPosition: true } },
        reviewedBy: true,
      },
    });
  },

  /** Daftar pengajuan pending sesuai cakupan reviewer. */
  async listPendingForScope(scope: ApprovalScope) {
    return prisma.leaveRequest.findMany({
      where: buildLeaveWhereForScope(scope),
      orderBy: { createdAt: "desc" },
      include: {
        user: { include: { jobPosition: true } },
        reviewedBy: true,
      },
    });
  },

  /** Daftar pengajuan yang boleh dilihat seorang viewer di desktop. */
  async listForViewer(viewer: {
    role: Role | string;
    positionId?: string | null;
  }) {
    const divisionId = await ApprovalRoutingService.getUserDivisionId(viewer);
    const where = buildLeaveWhereForViewer({ divisionId });

    return prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { include: { jobPosition: true } },
        reviewedBy: true,
      },
    });
  },

  /** Cari pengajuan lewat URL lampiran — dipakai untuk cek kepemilikan saat serve file. */
  async findByAttachmentUrl(attachmentUrl: string) {
    return prisma.leaveRequest.findFirst({
      where: { attachmentUrl },
      select: { userId: true },
    });
  },

  /** Jumlah pengajuan yang menunggu giliran (bisa berdasarkan stage atau ApprovalScope). */
  async countPending(stageOrScope?: LeaveStage | ApprovalScope) {
    if (!stageOrScope) {
      return prisma.leaveRequest.count({
        where: { status: LeaveStatus.PENDING },
      });
    }
    if (typeof stageOrScope === "object" && "kind" in stageOrScope) {
      return prisma.leaveRequest.count({
        where: buildLeaveWhereForScope(stageOrScope),
      });
    }
    return prisma.leaveRequest.count({
      where: { status: LeaveStatus.PENDING, stage: stageOrScope },
    });
  },

  async countPendingForScope(scope: ApprovalScope) {
    return prisma.leaveRequest.count({
      where: buildLeaveWhereForScope(scope),
    });
  },

  /** Batalkan pengajuan sendiri selama belum direview. */
  async cancelOwn(id: string, userId: string): Promise<boolean> {
    const { count } = await prisma.leaveRequest.deleteMany({
      where: { id, userId, status: LeaveStatus.PENDING },
    });

    return count > 0;
  },

  async create(data: CreateLeaveData) {
    return prisma.leaveRequest.create({ data });
  },

  /**
   * Cek tabrakan tanggal lalu buat pengajuan dalam satu transaksi
   * Serializable, supaya dua submit hampir bersamaan (double-click, dua tab)
   * tidak bisa sama-sama lolos cek lalu membuat baris yang tumpang tindih —
   * beda dari `findOverlapping` + `create` terpisah yang punya celah race.
   */
  async createIfNotOverlapping(data: CreateLeaveData) {
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
   * login. Satu langkah saja — menyetujui maupun menolak sama-sama langsung
   * mengakhiri pengajuan (stage DONE).
   *
   * `updateMany` di-guard dengan `status: PENDING, stage` supaya dua reviewer
   * (atau reviewer yang sama di dua tab) tidak bisa memproses giliran yang
   * sama dua kali, dan supaya reviewer tidak bisa memutuskan giliran yang
   * bukan miliknya.
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
    const { count } = await prisma.leaveRequest.updateMany({
      where: { id, status: LeaveStatus.PENDING, stage: data.stage },
      data: {
        status: data.status,
        stage: LeaveStage.DONE,
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
