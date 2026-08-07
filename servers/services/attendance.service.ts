import prisma from "@/lib/prisma";
import {
  Attendance,
  AttendanceType,
  RadiusReviewStatus,
} from "@/generated/prisma";
import { CreateAttendanceDTO } from "../validators/attendance.validator";

export type DailyAttendance = {
  workDate: Date;
  checkIn: Attendance | null;
  checkOut: Attendance | null;
};

export const AttendanceService = {
  async create(data: CreateAttendanceDTO) {
    return prisma.attendance.create({ data });
  },

  async getById(id: string) {
    return prisma.attendance.findUnique({
      where: { id },
      include: { user: true },
    });
  },

  /** Absensi semua karyawan pada satu hari kerja (untuk rekap admin). */
  async listByDate(workDate: Date) {
    return prisma.attendance.findMany({
      where: { workDate },
      orderBy: { timestamp: "asc" },
      include: { user: true },
    });
  },

  /** Absensi semua/sebagian karyawan dalam rentang tanggal (untuk laporan). */
  async listByRange(range: {
    startDate: Date;
    endDate: Date;
    userId?: string;
  }) {
    return prisma.attendance.findMany({
      where: {
        workDate: { gte: range.startDate, lte: range.endDate },
        ...(range.userId ? { userId: range.userId } : {}),
      },
      orderBy: [{ workDate: "asc" }, { timestamp: "asc" }],
    });
  },

  /** Absensi seorang user pada satu hari kerja. */
  async listByUserAndDate(userId: string, workDate: Date) {
    return prisma.attendance.findMany({
      where: { userId, workDate },
      orderBy: { timestamp: "asc" },
    });
  },

  /** Absensi luar radius yang menunggu keputusan admin (terbaru dulu). */
  async listPendingReview() {
    return prisma.attendance.findMany({
      where: { reviewStatus: RadiusReviewStatus.PENDING },
      orderBy: [{ workDate: "desc" }, { timestamp: "desc" }],
      include: { user: true },
    });
  },

  async countPendingReview() {
    return prisma.attendance.count({
      where: { reviewStatus: RadiusReviewStatus.PENDING },
    });
  },

  /**
   * Putuskan absensi luar radius. Hanya berlaku kalau statusnya masih PENDING,
   * sehingga dua admin tidak bisa memutuskan absensi yang sama dua kali.
   */
  async review(
    id: string,
    data: {
      status: RadiusReviewStatus;
      reviewedById: string;
      reviewNote: string | null;
    },
  ): Promise<boolean> {
    const { count } = await prisma.attendance.updateMany({
      where: { id, reviewStatus: RadiusReviewStatus.PENDING },
      data: {
        reviewStatus: data.status,
        reviewedById: data.reviewedById,
        reviewNote: data.reviewNote,
        reviewedAt: new Date(),
      },
    });

    return count > 0;
  },

  async getTodayStatus(userId: string, workDate: Date) {
    const items = await this.listByUserAndDate(userId, workDate);

    return {
      checkIn: items.find((i) => i.type === AttendanceType.CHECK_IN) ?? null,
      checkOut: items.find((i) => i.type === AttendanceType.CHECK_OUT) ?? null,
    };
  },

  /** Riwayat satu user, dikelompokkan per hari kerja (terbaru dulu). */
  async listGroupedByDate(
    userId: string,
    range: { startDate: Date; endDate: Date },
  ): Promise<DailyAttendance[]> {
    const items = await prisma.attendance.findMany({
      where: {
        userId,
        workDate: { gte: range.startDate, lte: range.endDate },
      },
      orderBy: [{ workDate: "desc" }, { timestamp: "asc" }],
    });

    const byDate = new Map<number, DailyAttendance>();

    for (const item of items) {
      const key = item.workDate.getTime();
      const row = byDate.get(key) ?? {
        workDate: item.workDate,
        checkIn: null,
        checkOut: null,
      };

      if (item.type === AttendanceType.CHECK_IN) row.checkIn = item;
      else row.checkOut = item;

      byDate.set(key, row);
    }

    return [...byDate.values()];
  },
};
