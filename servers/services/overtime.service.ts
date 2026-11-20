import prisma from "@/lib/prisma";
import {
  AttendanceApproval,
  OvertimeStage,
  Prisma,
  Role,
} from "@/generated/prisma";
import type { ApprovalScope } from "@/lib/approval-routing";
import {
  ApprovalRoutingService,
  buildOvertimeWhereForScope,
  buildOvertimeWhereForViewer,
} from "./approval-routing.service";

export type OvertimeListOptions = {
  userId?: string;
  status?: AttendanceApproval;
  stage?: OvertimeStage;
  scope?: ApprovalScope;
  where?: Prisma.OvertimeWhereInput;
};

function overtimeWhere(opts: OvertimeListOptions): Prisma.OvertimeWhereInput {
  const and: Prisma.OvertimeWhereInput[] = [];

  if (opts.userId) and.push({ userId: opts.userId });
  if (opts.status) and.push({ status: opts.status });
  if (opts.stage) and.push({ stage: opts.stage });
  if (opts.scope) and.push(buildOvertimeWhereForScope(opts.scope));
  if (opts.where) and.push(opts.where);

  return and.length ? { AND: and } : {};
}

export const OvertimeService = {
  async list(opts: OvertimeListOptions = {}) {
    return prisma.overtime.findMany({
      where: overtimeWhere(opts),
      orderBy: { startAt: "desc" },
      include: {
        user: { include: { jobPosition: true } },
        reviewedBy: true,
      },
    });
  },

  async getById(id: string) {
    return prisma.overtime.findUnique({
      where: { id },
      include: {
        user: { include: { jobPosition: true } },
        reviewedBy: true,
      },
    });
  },

  /** Daftar pengajuan lembur pending sesuai cakupan reviewer. */
  async listPendingForScope(scope: ApprovalScope) {
    return prisma.overtime.findMany({
      where: buildOvertimeWhereForScope(scope),
      orderBy: { startAt: "desc" },
      include: {
        user: { include: { jobPosition: true } },
        reviewedBy: true,
      },
    });
  },

  /** Daftar pengajuan lembur yang boleh dilihat seorang viewer di desktop. */
  async listForViewer(viewer: {
    role: Role | string;
    positionId?: string | null;
  }) {
    const divisionId = await ApprovalRoutingService.getUserDivisionId(viewer);
    const where = buildOvertimeWhereForViewer({ divisionId });

    return prisma.overtime.findMany({
      where,
      orderBy: { startAt: "desc" },
      include: {
        user: { include: { jobPosition: true } },
        reviewedBy: true,
      },
    });
  },

  /** Semua lembur pada satu tanggal kerja (semua karyawan) — rekap harian admin. */
  async listByWorkDate(workDate: Date) {
    return prisma.overtime.findMany({
      where: { workDate },
      orderBy: { startAt: "asc" },
    });
  },

  /**
   * Koreksi jam lembur oleh admin. Status approval tidak disentuh — yang
   * berubah hanya jam, durasi turunannya, dan jejaknya. `original*` diisi
   * pemanggil dengan jam sebelum koreksi PERTAMA.
   */
  async updateTimes(
    id: string,
    data: {
      startAt: Date;
      endAt: Date | null;
      durationMinutes: number | null;
      editedById: string;
      editNote: string;
      originalStartAt: Date;
      originalEndAt: Date | null;
    },
  ) {
    return prisma.overtime.update({
      where: { id },
      data: {
        startAt: data.startAt,
        endAt: data.endAt,
        durationMinutes: data.durationMinutes,
        editedById: data.editedById,
        editedAt: new Date(),
        editNote: data.editNote,
        originalStartAt: data.originalStartAt,
        originalEndAt: data.originalEndAt,
      },
    });
  },

  /** Sesi lembur milik user yang masih berjalan (`endAt` null), kalau ada. */
  async getOpenForUser(userId: string) {
    return prisma.overtime.findFirst({
      where: { userId, endAt: null },
    });
  },

  /** Lembur yang sudah disetujui dalam rentang tanggal — dipakai laporan bulanan. */
  async listApprovedInRange(range: {
    startDate: Date;
    endDate: Date;
    userId?: string;
  }) {
    return prisma.overtime.findMany({
      where: {
        status: AttendanceApproval.APPROVED,
        workDate: { gte: range.startDate, lte: range.endDate },
        ...(range.userId ? { userId: range.userId } : {}),
      },
    });
  },

  /** Jumlah pengajuan yang menunggu giliran (bisa berdasarkan stage atau ApprovalScope). */
  async countPending(stageOrScope?: OvertimeStage | ApprovalScope) {
    if (!stageOrScope) {
      return prisma.overtime.count({
        where: { status: AttendanceApproval.PENDING },
      });
    }
    if (typeof stageOrScope === "object" && "kind" in stageOrScope) {
      return prisma.overtime.count({
        where: buildOvertimeWhereForScope(stageOrScope),
      });
    }
    return prisma.overtime.count({
      where: { status: AttendanceApproval.PENDING, ...(stageOrScope ? { stage: stageOrScope } : {}) },
    });
  },

  async countPendingForScope(scope: ApprovalScope) {
    return prisma.overtime.count({
      where: buildOvertimeWhereForScope(scope),
    });
  },

  async create(data: {
    userId: string;
    workDate: Date;
    startAt: Date;
    reason: string;
    /** Giliran approval awal. Default skema: `OvertimeStage.ADMIN`. */
    stage?: OvertimeStage;
    /** Status awal. Default skema: `PENDING` — dipakai untuk pengajuan yang
     * langsung disetujui sendiri (mis. supervisor mengajukan lemburnya sendiri). */
    status?: AttendanceApproval;
    /** Catatan otomatis, mis. "Disetujui otomatis — pengajuan supervisor". */
    reviewNote?: string;
    reviewedAt?: Date;
  }) {
    return prisma.overtime.create({ data });
  },

  /**
   * Tutup sesi lembur yang sedang berjalan. `updateMany` di-guard dengan
   * `endAt: null` supaya sesi yang sudah ditutup tidak bisa ditutup dua kali
   * (mis. dua tab, atau retry setelah timeout).
   */
  async end(
    id: string,
    data: { endAt: Date; durationMinutes: number },
  ): Promise<boolean> {
    const { count } = await prisma.overtime.updateMany({
      where: { id, endAt: null },
      data: { endAt: data.endAt, durationMinutes: data.durationMinutes },
    });

    return count > 0;
  },

  /**
   * Setujui/tolak pengajuan pada giliran `stage` milik reviewer yang sedang
   * login. Menolak selalu mengakhiri pengajuan (REJECTED, stage DONE).
   * Menyetujui memindahkan giliran ke `nextOvertimeStage` (ADMIN -> SUPERVISOR
   * -> DONE). `updateMany` di-guard dengan `status: PENDING, stage` supaya dua
   * reviewer tidak bisa memproses giliran yang sama dua kali.
   */
  async review(
    id: string,
    data: {
      stage: OvertimeStage;
      nextStage: OvertimeStage;
      status: AttendanceApproval;
      reviewedById: string;
      reviewNote: string | null;
      /** Ditolak sambil lembur masih berjalan (`endAt` null) — tutup sesinya
       * sekalian supaya tidak menggantung selamanya dan memblokir lembur
       * berikutnya. */
      closeSession?: { endAt: Date; durationMinutes: number };
    },
  ): Promise<boolean> {
    const { count } = await prisma.overtime.updateMany({
      where: { id, status: AttendanceApproval.PENDING, stage: data.stage },
      data: {
        status: data.status,
        stage: data.nextStage,
        reviewedById: data.reviewedById,
        reviewNote: data.reviewNote,
        reviewedAt: new Date(),
        ...(data.closeSession
          ? {
              endAt: data.closeSession.endAt,
              durationMinutes: data.closeSession.durationMinutes,
            }
          : {}),
      },
    });

    return count > 0;
  },
};
