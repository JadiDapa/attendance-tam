import prisma from "@/lib/prisma";
import { AttendanceApproval, TransportationType } from "@/generated/prisma";

export type FieldAssignmentListOptions = {
  createdById?: string;
  employeeId?: string;
  status?: AttendanceApproval;
};

function fieldAssignmentWhere(opts: FieldAssignmentListOptions) {
  const and = [];

  if (opts.createdById) and.push({ createdById: opts.createdById });
  if (opts.employeeId)
    and.push({ employees: { some: { id: opts.employeeId } } });
  if (opts.status) and.push({ status: opts.status });

  return and.length ? { AND: and } : {};
}

export const FieldAssignmentService = {
  async list(opts: FieldAssignmentListOptions = {}) {
    return prisma.fieldAssignment.findMany({
      where: fieldAssignmentWhere(opts),
      orderBy: { createdAt: "desc" },
      include: { employees: true, createdBy: true, reviewedBy: true },
    });
  },

  async getById(id: string) {
    return prisma.fieldAssignment.findUnique({
      where: { id },
      include: { employees: true, createdBy: true, reviewedBy: true },
    });
  },

  async countPending() {
    return prisma.fieldAssignment.count({
      where: { status: AttendanceApproval.PENDING },
    });
  },

  /** Cari lewat URL lampiran — dipakai untuk cek kepemilikan saat serve file. */
  async findByAttachmentUrl(attachmentUrl: string) {
    return prisma.fieldAssignment.findFirst({
      where: { attachmentUrl },
      select: { createdById: true, employees: { select: { id: true } } },
    });
  },

  async create(data: {
    createdById: string;
    employeeIds: string[];
    startDate: Date;
    endDate: Date;
    activityDetail: string;
    destinationCity: string;
    destinationAddress: string;
    purpose: string;
    companyName: string | null;
    transportation: TransportationType;
    transportationOther: string | null;
    estimatedCost: number;
    attachmentUrl: string;
  }) {
    return prisma.fieldAssignment.create({
      data: {
        createdById: data.createdById,
        startDate: data.startDate,
        endDate: data.endDate,
        activityDetail: data.activityDetail,
        destinationCity: data.destinationCity,
        destinationAddress: data.destinationAddress,
        purpose: data.purpose,
        companyName: data.companyName,
        transportation: data.transportation,
        transportationOther: data.transportationOther,
        estimatedCost: data.estimatedCost,
        attachmentUrl: data.attachmentUrl,
        employees: { connect: data.employeeIds.map((id) => ({ id })) },
      },
      include: { employees: true },
    });
  },

  /** Batalkan pengajuan sendiri selama belum di-review admin. */
  async cancelOwn(id: string, createdById: string): Promise<boolean> {
    const { count } = await prisma.fieldAssignment.deleteMany({
      where: { id, createdById, status: AttendanceApproval.PENDING },
    });

    return count > 0;
  },

  /**
   * Setujui/tolak pengajuan. Satu langkah saja (admin) — beda dari izin dan
   * lembur yang berjenjang, jadi tidak ada `stage` untuk dilanjutkan.
   * `updateMany` di-guard dengan `status: PENDING` supaya dua admin (atau
   * admin yang sama di dua tab) tidak bisa memproses pengajuan yang sama
   * dua kali.
   */
  async decide(
    id: string,
    data: {
      status: typeof AttendanceApproval.APPROVED | typeof AttendanceApproval.REJECTED;
      reviewedById: string;
      reviewNote: string | null;
    },
  ): Promise<boolean> {
    const { count } = await prisma.fieldAssignment.updateMany({
      where: { id, status: AttendanceApproval.PENDING },
      data: {
        status: data.status,
        reviewedById: data.reviewedById,
        reviewNote: data.reviewNote,
        reviewedAt: new Date(),
      },
    });

    return count > 0;
  },

  /** Penugasan disetujui yang bersinggungan dengan rentang tanggal (untuk laporan). */
  async listApprovedInRange(range: {
    startDate: Date;
    endDate: Date;
    userId?: string;
  }) {
    return prisma.fieldAssignment.findMany({
      where: {
        status: AttendanceApproval.APPROVED,
        startDate: { lte: range.endDate },
        endDate: { gte: range.startDate },
        ...(range.userId ? { employees: { some: { id: range.userId } } } : {}),
      },
      include: { employees: { select: { id: true } } },
    });
  },
};
