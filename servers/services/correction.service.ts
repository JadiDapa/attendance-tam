import prisma from "@/lib/prisma";
import { AttendanceType, CorrectionStatus, Prisma } from "@/generated/prisma";
import { CreateCorrectionDTO } from "../validators/correction.validator";

export type CorrectionListOptions = {
  userId?: string;
  status?: CorrectionStatus;
};

/** Absensi yang akan ditulis saat koreksi disetujui. */
export type CorrectionAttendance = {
  timestamp: Date;
  isLate: boolean;
};

function correctionWhere(
  opts: CorrectionListOptions,
): Prisma.AttendanceCorrectionWhereInput {
  const and: Prisma.AttendanceCorrectionWhereInput[] = [];

  if (opts.userId) and.push({ userId: opts.userId });
  if (opts.status) and.push({ status: opts.status });

  return and.length ? { AND: and } : {};
}

/**
 * Tulis absensi hasil koreksi. Foto & koordinat sengaja dibiarkan null —
 * koreksi memang dibuat saat karyawan tidak sedang memegang HP-nya, jadi tidak
 * ada bukti lokasi yang jujur bisa disimpan.
 *
 * Kalau barisnya sudah ada (mis. jamnya yang salah, bukan absennya yang hilang),
 * hanya jam & penanda koreksi yang diperbarui — foto lama tetap tersimpan.
 */
function upsertAttendance(
  tx: Prisma.TransactionClient,
  correction: {
    id: string;
    userId: string;
    workDate: Date;
    type: AttendanceType;
  },
  attendance: CorrectionAttendance,
) {
  return tx.attendance.upsert({
    where: {
      userId_workDate_type: {
        userId: correction.userId,
        workDate: correction.workDate,
        type: correction.type,
      },
    },
    create: {
      userId: correction.userId,
      type: correction.type,
      workDate: correction.workDate,
      timestamp: attendance.timestamp,
      isLate: attendance.isLate,
      isManual: true,
      correctionId: correction.id,
      latitude: null,
      longitude: null,
      distanceMeters: null,
      photoUrl: null,
      isWithinRadius: null,
    },
    update: {
      timestamp: attendance.timestamp,
      isLate: attendance.isLate,
      isManual: true,
      correctionId: correction.id,
    },
  });
}

export const CorrectionService = {
  async list(opts: CorrectionListOptions = {}) {
    return prisma.attendanceCorrection.findMany({
      where: correctionWhere(opts),
      orderBy: { createdAt: "desc" },
      include: { user: true, reviewedBy: true },
    });
  },

  async getById(id: string) {
    return prisma.attendanceCorrection.findUnique({
      where: { id },
      include: { user: true, reviewedBy: true },
    });
  },

  async countPending() {
    return prisma.attendanceCorrection.count({
      where: { status: CorrectionStatus.PENDING },
    });
  },

  /** Pengajuan yang masih menunggu untuk slot yang sama — mencegah dobel. */
  async findPending(userId: string, workDate: Date, type: AttendanceType) {
    return prisma.attendanceCorrection.findFirst({
      where: { userId, workDate, type, status: CorrectionStatus.PENDING },
    });
  },

  async create(data: CreateCorrectionDTO) {
    return prisma.attendanceCorrection.create({ data });
  },

  /** Koreksi yang dibuat admin: langsung disetujui dan absensinya ikut ditulis. */
  async createApproved(
    data: CreateCorrectionDTO,
    attendance: CorrectionAttendance,
  ) {
    return prisma.$transaction(async (tx) => {
      const correction = await tx.attendanceCorrection.create({ data });

      await upsertAttendance(tx, correction, attendance);

      return correction;
    });
  },

  /**
   * Setujui koreksi lalu tulis absensinya dalam satu transaksi. Hanya berlaku
   * kalau statusnya masih PENDING, sehingga dua admin tidak bisa memproses
   * pengajuan yang sama dua kali.
   *
   * Mengembalikan false kalau pengajuannya sudah diproses admin lain.
   */
  async approve(
    id: string,
    input: {
      reviewedById: string;
      reviewNote: string | null;
      attendance: CorrectionAttendance;
    },
  ): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.attendanceCorrection.updateMany({
        where: { id, status: CorrectionStatus.PENDING },
        data: {
          status: CorrectionStatus.APPROVED,
          reviewedById: input.reviewedById,
          reviewNote: input.reviewNote,
          reviewedAt: new Date(),
        },
      });

      if (count === 0) return false;

      const correction = await tx.attendanceCorrection.findUniqueOrThrow({
        where: { id },
      });

      await upsertAttendance(tx, correction, input.attendance);

      return true;
    });
  },

  /** Tolak koreksi — tidak ada absensi yang ditulis. */
  async reject(
    id: string,
    input: { reviewedById: string; reviewNote: string | null },
  ): Promise<boolean> {
    const { count } = await prisma.attendanceCorrection.updateMany({
      where: { id, status: CorrectionStatus.PENDING },
      data: {
        status: CorrectionStatus.REJECTED,
        reviewedById: input.reviewedById,
        reviewNote: input.reviewNote,
        reviewedAt: new Date(),
      },
    });

    return count > 0;
  },

  /** Batalkan pengajuan sendiri selama belum di-review. */
  async cancelOwn(id: string, userId: string): Promise<boolean> {
    const { count } = await prisma.attendanceCorrection.deleteMany({
      where: { id, userId, status: CorrectionStatus.PENDING },
    });

    return count > 0;
  },
};
