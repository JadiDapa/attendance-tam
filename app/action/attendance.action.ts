"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AttendanceApproval,
  AttendanceType,
  Prisma,
  Role,
  WorkMode,
} from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { saveImage } from "@/lib/storage";
import { haversineDistance, formatDistance } from "@/lib/geo";
import {
  formatWorkDate,
  fromDateInputValue,
  getMinutesOfDay,
  getWorkDate,
  parseTimeToMinutes,
  workDateTimeToUtc,
} from "@/lib/date";
import {
  ManualAttendanceSchema,
  ReviewAttendanceSchema,
  SubmitAttendanceSchema,
} from "@/servers/validators/attendance.validator";
import { WORK_MODE_LABEL, isLateEligible } from "@/lib/work-mode";
import { ATTENDANCE_TYPE_LABEL } from "@/lib/attendance";
import { AttendanceService } from "@/servers/services/attendance.service";
import {
  OfficeLocationService,
  WorkDayService,
  WorkScheduleService,
} from "@/servers/services/setting.service";
import { HolidayService } from "@/servers/services/holiday.service";
import { FaceService } from "@/servers/services/face.service";
import { UserService } from "@/servers/services/user.service";
import { verifyFace, FaceApiError } from "@/lib/face-recognition";
import {
  getWorkDayFor,
  isLateAt,
  type WorkDayConfig,
} from "@/lib/work-schedule";

export type AttendanceResult =
  | { ok: true; message: string; warning?: string }
  | { ok: false; error: string };

export type ReviewAttendanceResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/** Penjelasan absen luar radius yang terlalu pendek tidak bisa dinilai admin. */
const MIN_DETAIL_LENGTH = 5;

/** Halaman yang ikut berubah kalau data absensi berubah. */
const ATTENDANCE_PATHS = [
  "/dashboard",
  "/riwayat",
  "/admin/verifikasi",
  "/admin/dashboard",
  "/admin/kehadiran",
  "/admin/rekapan-karyawan",
  "/admin/laporan",
];

function revalidateAttendancePages() {
  for (const path of ATTENDANCE_PATHS) revalidatePath(path);
}

/**
 * Terlambat hanya berlaku untuk absen masuk yang benar-benar dikerjakan di
 * kantor pada hari kerja. WFH, dinas luar, sakit/izin/cuti, dan hari libur
 * (mingguan maupun tanggal merah) tidak pernah dihitung terlambat.
 *
 * Sengaja murni (tanpa query) supaya pemanggil yang sudah punya datanya tidak
 * mengambilnya dua kali. `isLateAt()` tetap satu-satunya definisi "terlambat".
 */
function resolveIsLate(input: {
  type: AttendanceType;
  mode: WorkMode;
  workDate: Date;
  minutesOfDay: number;
  workDays: WorkDayConfig[];
  toleranceMinutes: number;
  isHoliday: boolean;
}): boolean {
  if (input.type !== AttendanceType.CHECK_IN) return false;
  if (!isLateEligible(input.mode)) return false;
  if (input.isHoliday) return false;

  return isLateAt(
    input.minutesOfDay,
    getWorkDayFor(input.workDate, input.workDays),
    input.toleranceMinutes,
  );
}

export async function submitAttendance(
  formData: FormData,
): Promise<AttendanceResult> {
  const user = await requireRole(Role.EMPLOYEE);

  const parsed = SubmitAttendanceSchema.safeParse({
    type: formData.get("type"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    accuracy: formData.get("accuracy"),
    workMode: formData.get("workMode"),
    workModeDetail: formData.get("workModeDetail"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data absensi tidak valid",
    };
  }

  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return { ok: false, error: "Foto absensi wajib diambil" };
  }

  const { type, latitude, longitude, accuracy } = parsed.data;
  const now = new Date();
  const workDate = getWorkDate(now);

  // Semua pembacaan yang saling bebas dijalankan sekaligus, termasuk embedding
  // wajah karyawan — dulu embedding-nya diambil sendirian lebih dulu sehingga
  // latensinya berurutan dengan query yang lain.
  const [referenceEmbeddings, [status, office, schedule, workDays, holiday]] =
    await Promise.all([
      FaceService.listByUser(user.id),
      Promise.all([
        AttendanceService.getTodayStatus(user.id, workDate),
        OfficeLocationService.getActive(),
        WorkScheduleService.getActive(),
        WorkDayService.list(),
        HolidayService.getByDate(workDate),
      ]),
    ]);

  if (referenceEmbeddings.length < FaceService.minEnrollmentPhotos) {
    return {
      ok: false,
      error:
        "Wajah kamu belum terdaftar. Lengkapi pendaftaran wajah di halaman Profil terlebih dahulu.",
    };
  }

  if (type === AttendanceType.CHECK_IN && status.checkIn) {
    return { ok: false, error: "Kamu sudah absen masuk hari ini" };
  }

  if (type === AttendanceType.CHECK_OUT) {
    if (!status.checkIn) {
      return { ok: false, error: "Absen masuk dulu sebelum absen pulang" };
    }
    if (status.checkOut) {
      return { ok: false, error: "Kamu sudah absen pulang hari ini" };
    }
  }

  if (!office) {
    return {
      ok: false,
      error: "Lokasi kantor belum diatur admin. Hubungi admin.",
    };
  }

  // Pembacaan GPS yang kasar bisa meleset ribuan meter — kalau diterima, jarak
  // ke kantor jadi tidak bermakna dan keputusan admin ikut tidak bisa
  // dipercaya. Ambangnya diatur admin di menu Waktu Kerja.
  const maxAccuracy = schedule?.maxAccuracyMeters ?? 100;

  if (accuracy > maxAccuracy) {
    return {
      ok: false,
      error: `Akurasi lokasi terlalu rendah (±${Math.round(accuracy)} m, maksimal ±${maxAccuracy} m). Coba di area terbuka lalu ulangi.`,
    };
  }

  const distanceMeters = haversineDistance(
    latitude,
    longitude,
    office.latitude,
    office.longitude,
  );
  const isWithinRadius = distanceMeters <= office.radiusMeters;

  // Di luar radius, karyawan wajib menyatakan sedang WFH atau dinas luar dan
  // menjelaskannya — tanpa itu absensinya tidak bisa dinilai admin. Klaimnya
  // divalidasi di sini, bukan di client, supaya tidak bisa dilewati.
  const detail = parsed.data.workModeDetail?.trim() ?? "";
  let workMode: WorkMode = WorkMode.HADIR_DIKANTOR;
  let workModeDetail: string | null = null;

  if (!isWithinRadius) {
    if (!parsed.data.workMode) {
      return {
        ok: false,
        error: `Kamu berada ${formatDistance(distanceMeters)} dari ${office.name}. Pilih alasannya (WFH atau Dinas Luar) sebelum mengirim.`,
      };
    }

    if (detail.length < MIN_DETAIL_LENGTH) {
      return {
        ok: false,
        error: "Tulis penjelasan singkat untuk absensi di luar kantor",
      };
    }

    workMode = parsed.data.workMode;
    workModeDetail = detail;
  }

  // Verifikasi 1:1: pastikan foto ini benar wajah pemilik akun yang sedang
  // login (anti titip absen) — bukan pencarian di antara semua karyawan,
  // karena siapa yang absen sudah diketahui dari sesi login.
  //
  // Sengaja dijalankan paling akhir di antara pemeriksaan: ini satu-satunya
  // langkah yang makan waktu (round-trip ke layanan DeepFace, ~1-2 detik), jadi
  // penolakan yang murah — sudah absen, kantor belum diatur, akurasi GPS jelek,
  // alasan luar radius belum diisi — tidak perlu ikut menunggunya.
  try {
    const result = await verifyFace(
      photo,
      referenceEmbeddings.map((row) => row.vector),
    );

    if (result.status !== "match") {
      return {
        ok: false,
        error:
          "Wajah tidak cocok dengan data yang terdaftar. Pastikan wajah terlihat jelas lalu coba lagi.",
      };
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof FaceApiError
          ? error.message
          : "Gagal memverifikasi wajah, coba lagi",
    };
  }

  const isLate = resolveIsLate({
    type,
    mode: workMode,
    workDate,
    minutesOfDay: getMinutesOfDay(now),
    workDays,
    toleranceMinutes: schedule?.lateToleranceMinutes ?? 0,
    isHoliday: holiday !== null,
  });

  let photoUrl: string;

  try {
    photoUrl = await saveImage(photo);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan foto",
    };
  }

  try {
    await AttendanceService.create({
      userId: user.id,
      type,
      workDate,
      latitude,
      longitude,
      photoUrl,
      distanceMeters,
      accuracyMeters: accuracy,
      isWithinRadius,
      isLate,
      workMode,
      workModeDetail,
      // Absen di luar radius baru sah setelah admin menyetujuinya.
      approvalStatus: isWithinRadius ? null : AttendanceApproval.PENDING,
    });
  } catch (error) {
    // Absen ganda tertangkap unique constraint (userId, workDate, type).
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "Absensi untuk hari ini sudah tercatat" };
    }
    throw error;
  }

  revalidateAttendancePages();

  const warnings: string[] = [];

  if (!isWithinRadius) {
    warnings.push(
      `Tercatat sebagai ${WORK_MODE_LABEL[workMode]} — ${formatDistance(distanceMeters)} dari ${office.name}. Menunggu persetujuan admin.`,
    );
  }

  if (isLate) {
    const workDay = getWorkDayFor(workDate, workDays);

    warnings.push(
      `Tercatat terlambat dari jam masuk ${workDay.checkInTime} (toleransi ${schedule?.lateToleranceMinutes ?? 0} menit).`,
    );
  }

  return {
    ok: true,
    message:
      type === AttendanceType.CHECK_IN
        ? "Absen masuk tercatat"
        : "Absen pulang tercatat",
    warning: warnings.length ? warnings.join(" ") : undefined,
  };
}

/**
 * Keputusan admin atas absensi luar radius: setujui (boleh menimpa mode yang
 * diklaim karyawan) atau tolak. Absensi yang ditolak dianulir — hari itu
 * dihitung Alfa, tapi barisnya tetap tersimpan sebagai jejak.
 */
export async function reviewAttendance(
  attendanceId: string,
  input: z.input<typeof ReviewAttendanceSchema>,
): Promise<ReviewAttendanceResult> {
  const admin = await requireRole(Role.ADMIN);

  const parsed = ReviewAttendanceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Keputusan tidak valid",
    };
  }

  const attendance = await AttendanceService.getById(attendanceId);

  if (!attendance) {
    return { ok: false, error: "Absensi tidak ditemukan" };
  }

  const isApproved = parsed.data.status === AttendanceApproval.APPROVED;
  const approvedMode = isApproved ? (parsed.data.mode ?? null) : null;

  // Menyetujui sebagai "hadir di kantor" berarti pembacaan GPS-nya dianggap
  // meleset, jadi aturan terlambat berlaku lagi dan harus dihitung ulang dari
  // jam absen aslinya. Mode lain tidak pernah terlambat.
  let isLate = false;

  if (approvedMode !== null && isLateEligible(approvedMode)) {
    const [schedule, workDays, holiday] = await Promise.all([
      WorkScheduleService.getActive(),
      WorkDayService.list(),
      HolidayService.getByDate(attendance.workDate),
    ]);

    isLate = resolveIsLate({
      type: attendance.type,
      mode: approvedMode,
      workDate: attendance.workDate,
      minutesOfDay: getMinutesOfDay(attendance.timestamp),
      workDays,
      toleranceMinutes: schedule?.lateToleranceMinutes ?? 0,
      isHoliday: holiday !== null,
    });
  }

  const applied = await AttendanceService.decide(attendanceId, {
    status: parsed.data.status,
    approvedMode,
    isLate,
    reviewedById: admin.id,
    reviewNote: parsed.data.reviewNote?.trim() || null,
  });

  if (!applied) {
    return {
      ok: false,
      error: "Absensi tidak ditemukan atau sudah diputuskan admin lain",
    };
  }

  revalidateAttendancePages();

  return {
    ok: true,
    message: isApproved
      ? `Absensi disetujui sebagai ${WORK_MODE_LABEL[approvedMode!]}`
      : "Absensi ditolak — hari itu dihitung Alfa",
  };
}

/**
 * Absensi yang dicatat admin secara manual, mis. karyawan lupa absen pulang
 * atau HP-nya mati. Menggantikan fitur pengajuan koreksi absensi: tidak ada
 * antrean review, admin yang mencatat langsung bertanggung jawab atas isinya.
 */
export async function createManualAttendance(
  input: z.input<typeof ManualAttendanceSchema>,
): Promise<ReviewAttendanceResult> {
  const admin = await requireRole(Role.ADMIN);

  const parsed = ManualAttendanceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data absensi tidak valid",
    };
  }

  const workDate = fromDateInputValue(parsed.data.workDate);

  if (!workDate) return { ok: false, error: "Tanggal tidak valid" };

  if (workDate.getTime() > getWorkDate().getTime()) {
    return {
      ok: false,
      error: "Tidak bisa mencatat absensi untuk tanggal yang belum terjadi",
    };
  }

  const timestamp = workDateTimeToUtc(workDate, parsed.data.time);
  const minutesOfDay = parseTimeToMinutes(parsed.data.time);

  if (!timestamp || minutesOfDay === null) {
    return { ok: false, error: "Jam absensi tidak valid" };
  }

  const employee = await UserService.getById(parsed.data.userId);

  if (!employee || employee.role !== Role.EMPLOYEE) {
    return { ok: false, error: "Karyawan tidak ditemukan" };
  }

  const [schedule, workDays, holiday] = await Promise.all([
    WorkScheduleService.getActive(),
    WorkDayService.list(),
    HolidayService.getByDate(workDate),
  ]);

  const isLate = resolveIsLate({
    type: parsed.data.type,
    mode: parsed.data.workMode,
    workDate,
    minutesOfDay,
    workDays,
    toleranceMinutes: schedule?.lateToleranceMinutes ?? 0,
    isHoliday: holiday !== null,
  });

  await AttendanceService.upsertManual({
    userId: employee.id,
    workDate,
    type: parsed.data.type,
    timestamp,
    workMode: parsed.data.workMode,
    isLate,
    reviewedById: admin.id,
    reviewNote: parsed.data.reviewNote,
  });

  revalidateAttendancePages();

  return {
    ok: true,
    message: `${ATTENDANCE_TYPE_LABEL[parsed.data.type]} ${employee.name} pada ${formatWorkDate(workDate)} dicatat`,
  };
}
