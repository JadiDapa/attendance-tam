import prisma from "@/lib/prisma";
import {
  Attendance,
  AttendanceApproval,
  AttendanceType,
  Role,
  WorkMode,
} from "@/generated/prisma";
import { CreateAttendanceDTO } from "../validators/attendance.validator";

export type DailyAttendance = {
  workDate: Date;
  checkIn: Attendance | null;
  checkOut: Attendance | null;
};

/** `CreateAttendanceDTO` plus keputusan otomatis kalau pemohonnya manager —
 * lihat `resolveAttendanceReviewerRole` di `lib/attendance.ts`. */
type CreateAttendanceData = CreateAttendanceDTO & {
  approvedMode?: WorkMode | null;
  reviewedAt?: Date | null;
  reviewNote?: string | null;
};

export const AttendanceService = {
  async create(data: CreateAttendanceData) {
    return prisma.attendance.create({ data });
  },

  async getById(id: string) {
    return prisma.attendance.findUnique({
      where: { id },
      include: { user: true },
    });
  },

  /** Cari absensi lewat URL foto — dipakai untuk cek kepemilikan saat serve file. */
  async findByPhotoUrl(photoUrl: string) {
    return prisma.attendance.findFirst({
      where: { photoUrl },
      select: { userId: true },
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

  /** Satu baris absensi tertentu (dipakai admin sebelum mencatat manual). */
  async findByUserDateType(
    userId: string,
    workDate: Date,
    type: AttendanceType,
  ) {
    return prisma.attendance.findUnique({
      where: { userId_workDate_type: { userId, workDate, type } },
    });
  },

  /** Semua absensi luar radius yang menunggu keputusan siapa pun (terbaru dulu) — untuk oversight admin. */
  async listPendingApproval() {
    return prisma.attendance.findMany({
      where: { approvalStatus: AttendanceApproval.PENDING },
      orderBy: [{ workDate: "desc" }, { timestamp: "desc" }],
      include: { user: true },
    });
  },

  /** Absensi luar radius yang menunggu giliran reviewer tertentu (SUPERVISOR/MANAGER) — lihat `ownerRolesForAttendanceReviewer`. */
  async listPendingApprovalForOwnerRoles(ownerRoles: Role[]) {
    if (ownerRoles.length === 0) return [];

    return prisma.attendance.findMany({
      where: {
        approvalStatus: AttendanceApproval.PENDING,
        user: { role: { in: ownerRoles } },
      },
      orderBy: [{ workDate: "desc" }, { timestamp: "desc" }],
      include: { user: true },
    });
  },

  async countPendingApproval() {
    return prisma.attendance.count({
      where: { approvalStatus: AttendanceApproval.PENDING },
    });
  },

  /** Sama seperti `listPendingApprovalForOwnerRoles`, tapi cuma jumlahnya — untuk badge sidebar. */
  async countPendingApprovalForOwnerRoles(ownerRoles: Role[]) {
    if (ownerRoles.length === 0) return 0;

    return prisma.attendance.count({
      where: {
        approvalStatus: AttendanceApproval.PENDING,
        user: { role: { in: ownerRoles } },
      },
    });
  },

  /**
   * Putuskan absensi luar radius. Hanya berlaku kalau statusnya masih PENDING,
   * sehingga dua admin tidak bisa memutuskan absensi yang sama dua kali.
   *
   * `isLate` dihitung ulang oleh action ketika admin menyetujui sebagai
   * `HADIR_DIKANTOR` — di mode lain keterlambatan tidak pernah berlaku.
   */
  async decide(
    id: string,
    data: {
      status: AttendanceApproval;
      approvedMode: WorkMode | null;
      isLate: boolean;
      reviewedById: string;
      reviewNote: string | null;
    },
  ): Promise<boolean> {
    const { count } = await prisma.attendance.updateMany({
      where: { id, approvalStatus: AttendanceApproval.PENDING },
      data: {
        approvalStatus: data.status,
        approvedMode: data.approvedMode,
        isLate: data.isLate,
        reviewedById: data.reviewedById,
        reviewNote: data.reviewNote,
        reviewedAt: new Date(),
      },
    });

    return count > 0;
  },

  /**
   * Catat/perbarui absensi secara manual oleh admin. Foto & koordinat sengaja
   * dibiarkan null — pencatatan manual memang dibuat saat karyawan tidak sedang
   * memegang HP-nya, jadi tidak ada bukti lokasi yang jujur bisa disimpan.
   *
   * Kalau barisnya sudah ada (jamnya yang salah, bukan absennya yang hilang),
   * foto lama tetap tersimpan — hanya jam, mode, dan penandanya yang diperbarui.
   */
  async upsertManual(data: {
    userId: string;
    workDate: Date;
    type: AttendanceType;
    timestamp: Date;
    workMode: WorkMode;
    isLate: boolean;
    reviewedById: string;
    reviewNote: string;
  }) {
    return prisma.attendance.upsert({
      where: {
        userId_workDate_type: {
          userId: data.userId,
          workDate: data.workDate,
          type: data.type,
        },
      },
      create: {
        userId: data.userId,
        type: data.type,
        workDate: data.workDate,
        timestamp: data.timestamp,
        workMode: data.workMode,
        isLate: data.isLate,
        isManual: true,
        reviewedById: data.reviewedById,
        reviewNote: data.reviewNote,
        reviewedAt: new Date(),
        latitude: null,
        longitude: null,
        distanceMeters: null,
        accuracyMeters: null,
        photoUrl: null,
        isWithinRadius: null,
        workModeDetail: null,
        // Dicatat admin sendiri, jadi tidak ada yang perlu disetujui lagi.
        approvalStatus: null,
        approvedMode: null,
      },
      update: {
        timestamp: data.timestamp,
        workMode: data.workMode,
        isLate: data.isLate,
        isManual: true,
        reviewedById: data.reviewedById,
        reviewNote: data.reviewNote,
        reviewedAt: new Date(),
        approvalStatus: null,
        approvedMode: null,
      },
    });
  },

  /**
   * Absen masuk milik user yang belum pernah diikuti absen pulang, untuk
   * hari-hari sebelum `today`. Dipakai untuk memblokir absen masuk baru
   * sampai karyawan mengonfirmasi absen pulang yang terlewat.
   */
  async listUnresolvedCheckouts(userId: string, today: Date) {
    const checkIns = await prisma.attendance.findMany({
      where: {
        userId,
        type: AttendanceType.CHECK_IN,
        workDate: { lt: today },
      },
      orderBy: { workDate: "asc" },
    });

    if (checkIns.length === 0) return [];

    const checkOuts = await prisma.attendance.findMany({
      where: {
        userId,
        type: AttendanceType.CHECK_OUT,
        workDate: { in: checkIns.map((row) => row.workDate) },
      },
      select: { workDate: true },
    });

    const resolvedDates = new Set(
      checkOuts.map((row) => row.workDate.getTime()),
    );

    return checkIns.filter((row) => !resolvedDates.has(row.workDate.getTime()));
  },

  /**
   * Karyawan mengonfirmasi sendiri absen pulang yang terlewat (beda dari
   * `upsertManual`, yang dicatat admin dan mewajibkan reviewer). Baris yang
   * sudah ada tidak boleh ditimpa — hari itu seharusnya sudah tidak muncul di
   * `listUnresolvedCheckouts` lagi begitu ada baris CHECK_OUT.
   */
  async selfConfirmCheckout(data: {
    userId: string;
    workDate: Date;
    timestamp: Date;
  }) {
    return prisma.attendance.create({
      data: {
        userId: data.userId,
        type: AttendanceType.CHECK_OUT,
        workDate: data.workDate,
        timestamp: data.timestamp,
        isManual: true,
        latitude: null,
        longitude: null,
        distanceMeters: null,
        accuracyMeters: null,
        photoUrl: null,
        isWithinRadius: null,
        workModeDetail: null,
        approvalStatus: null,
        approvedMode: null,
      },
    });
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
