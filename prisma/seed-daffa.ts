import { AttendanceType, LeaveReasonCategory, LeaveStatus, LeaveType, PrismaClient, WorkMode } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

/**
 * Data demo untuk satu karyawan (daffaalthaf@tarunagroup.co.id) supaya ada
 * riwayat absensi & pengajuan izin yang bisa dilihat di aplikasi mobile.
 * Tidak digabung ke prisma/seed.ts karena ini data personal buat demo,
 * bukan data dasar sistem (libur/jadwal/lokasi kantor).
 *
 * Jalankan: npx tsx prisma/seed-daffa.ts
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const EMAIL = "daffaalthaf@tarunagroup.co.id";

// Dekat Kantor Pusat (Monas, -6.1753924, 106.8271528) — di dalam radius 100m.
const OFFICE_LAT = -6.1753924;
const OFFICE_LNG = 106.8271528;

function atTime(date: Date, hours: number, minutes: number) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** N hari kerja (Senin-Jumat) terakhir, dari yang terlama ke terbaru, tidak termasuk hari ini. */
function lastWorkdays(n: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 1);

  while (days.length < n) {
    const dow = cursor.getDay();
    if (dow >= 1 && dow <= 5) days.unshift(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }

  return days;
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (!user) {
    throw new Error(`User dengan email ${EMAIL} tidak ditemukan — seed dulu lewat prisma/seed.ts.`);
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  const workdays = lastWorkdays(10);

  // Pola: telat di hari ke-2 & ke-7, lupa absen pulang di hari ke-5.
  const LATE_INDEXES = new Set([1, 6]);
  const MISSING_CHECKOUT_INDEXES = new Set([4]);

  let created = 0;

  for (const [index, workDate] of workdays.entries()) {
    const isLate = LATE_INDEXES.has(index);
    const checkInTime = isLate ? atTime(workDate, 8, 22) : atTime(workDate, 7, 54);

    await prisma.attendance.upsert({
      where: { userId_workDate_type: { userId: user.id, workDate, type: AttendanceType.CHECK_IN } },
      update: {},
      create: {
        userId: user.id,
        type: AttendanceType.CHECK_IN,
        workDate,
        timestamp: checkInTime,
        latitude: OFFICE_LAT,
        longitude: OFFICE_LNG,
        distanceMeters: 12.4,
        accuracyMeters: 8,
        isWithinRadius: true,
        isLate,
        workMode: WorkMode.HADIR_DIKANTOR,
      },
    });
    created += 1;

    if (!MISSING_CHECKOUT_INDEXES.has(index)) {
      const checkOutTime = atTime(workDate, 17, 6);

      await prisma.attendance.upsert({
        where: { userId_workDate_type: { userId: user.id, workDate, type: AttendanceType.CHECK_OUT } },
        update: {},
        create: {
          userId: user.id,
          type: AttendanceType.CHECK_OUT,
          workDate,
          timestamp: checkOutTime,
          latitude: OFFICE_LAT,
          longitude: OFFICE_LNG,
          distanceMeters: 15.1,
          accuracyMeters: 9,
          isWithinRadius: true,
          isLate: false,
          workMode: WorkMode.HADIR_DIKANTOR,
        },
      });
      created += 1;
    }
  }

  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
  };
  const daysAhead = (n: number) => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
  };

  const leaveRequests = [
    {
      type: LeaveType.SAKIT,
      startDate: daysAgo(6),
      endDate: daysAgo(6),
      detail: "Demam, istirahat di rumah",
      status: LeaveStatus.APPROVED,
    },
    {
      type: LeaveType.IZIN,
      startDate: daysAgo(2),
      endDate: daysAgo(2),
      detail: "Urus dokumen keluarga",
      reasonCategory: LeaveReasonCategory.IZIN_KELUARGA,
      status: LeaveStatus.REJECTED,
    },
    {
      type: LeaveType.CUTI,
      startDate: daysAhead(3),
      endDate: daysAhead(5),
      detail: "Cuti tahunan",
      reasonCategory: LeaveReasonCategory.CUTI_TAHUNAN,
      status: LeaveStatus.PENDING,
    },
  ];

  for (const leave of leaveRequests) {
    const existing = await prisma.leaveRequest.findFirst({
      where: { userId: user.id, type: leave.type, startDate: leave.startDate },
    });

    if (existing) continue;

    await prisma.leaveRequest.create({
      data: {
        userId: user.id,
        type: leave.type,
        startDate: leave.startDate,
        endDate: leave.endDate,
        detail: leave.detail,
        reasonCategory: leave.reasonCategory ?? null,
        status: leave.status,
        reviewedAt: leave.status === LeaveStatus.PENDING ? null : new Date(),
        reviewedById: leave.status === LeaveStatus.PENDING ? null : (admin?.id ?? null),
      },
    });
  }

  console.log(`Seeded ${created} baris absensi & ${leaveRequests.length} pengajuan izin untuk ${EMAIL}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
