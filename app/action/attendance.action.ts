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
import { requireAnyRole, requireRole, requireUser } from "@/lib/session";
import { saveImage, deleteUpload } from "@/lib/storage";
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
  ConfirmMissedCheckoutSchema,
  ManualAttendanceSchema,
  ReviewAttendanceSchema,
  SubmitAttendanceSchema,
} from "@/servers/validators/attendance.validator";
import { WORK_MODE_LABEL, isLateEligible } from "@/lib/work-mode";
import { ATTENDANCE_TYPE_LABEL, resolveAttendanceReviewerRole } from "@/lib/attendance";
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
  isCheckInClosed,
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

/**
 * Role yang boleh absen untuk diri sendiri lewat `submitAttendance`/
 * `confirmMissedCheckout`. Selain karyawan, admin/supervisor/manager juga
 * boleh mencatat kehadirannya sendiri lewat menu "Absensi Saya" masing-masing —
 * beda dari `requireRole(Role.ADMIN)` di bawah yang khusus untuk absensi
 * *karyawan lain* (verifikasi, pencatatan manual).
 */
const SELF_ATTENDANCE_ROLES = [
  Role.EMPLOYEE,
  Role.ADMIN,
  Role.SUPERVISOR,
  Role.MANAGER,
];

/** Halaman yang ikut berubah kalau data absensi berubah. */
const ATTENDANCE_PATHS = [
  "/dashboard",
  "/riwayat",
  "/admin/dashboard",
  "/admin/absensi",
  "/admin/verifikasi",
  "/admin/kehadiran",
  "/admin/rekapan-kehadiran",
  "/admin/laporan",
  "/supervisor/absensi",
  "/supervisor/verifikasi",
  "/manager/absensi",
  "/manager/verifikasi",
];

function revalidateAttendancePages() {
  for (const path of ATTENDANCE_PATHS) revalidatePath(path);
}

/**
 * Terlambat hanya berlaku untuk absen masuk yang benar-benar dikerjakan di
 * kantor pada hari kerja. Luar radius, sakit/izin/cuti, dan hari libur
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
  const user = await requireAnyRole(SELF_ATTENDANCE_ROLES);

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

  if (
    type === AttendanceType.CHECK_IN &&
    isCheckInClosed(getMinutesOfDay(now), getWorkDayFor(workDate, workDays))
  ) {
    return { ok: false, error: "Absen masuk sudah ditutup untuk hari ini" };
  }

  if (type === AttendanceType.CHECK_IN) {
    const unresolved = await AttendanceService.listUnresolvedCheckouts(
      user.id,
      workDate,
    );

    if (unresolved.length > 0) {
      return {
        ok: false,
        error: `Konfirmasi dulu absen pulang yang terlewat pada ${unresolved
          .map((row) => formatWorkDate(row.workDate))
          .join(", ")} sebelum absen masuk hari ini`,
      };
    }
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

  // Di luar radius, karyawan wajib menjelaskan alasannya — tanpa itu
  // absensinya tidak bisa dinilai admin. Absen di luar radius otomatis
  // dicatat LUAR_RADIUS (tidak ada pilihan mode, dan tidak ada WFH) — beda
  // dari "Dinas Luar" (`FieldAssignment`), yang direncanakan duluan.
  // Divalidasi di sini, bukan di client, supaya tidak bisa dilewati.
  const detail = parsed.data.workModeDetail?.trim() ?? "";
  let workMode: WorkMode = WorkMode.HADIR_DIKANTOR;
  let workModeDetail: string | null = null;

  if (!isWithinRadius) {
    if (detail.length < MIN_DETAIL_LENGTH) {
      return {
        ok: false,
        error: `Kamu berada ${formatDistance(distanceMeters)} dari ${office.name}. Tulis penjelasan singkat sebelum mengirim.`,
      };
    }

    workMode = WorkMode.LUAR_RADIUS;
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

  // Di luar radius, gilirannya ditentukan dari role pemohon (lihat
  // `resolveAttendanceReviewerRole`) — manager tidak punya siapa pun di
  // atasnya, jadi absensinya otomatis disetujui, tetap tercatat untuk
  // oversight.
  const reviewerRole = isWithinRadius
    ? null
    : resolveAttendanceReviewerRole(user.role);
  const autoApproved = !isWithinRadius && reviewerRole === null;

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
      approvalStatus: isWithinRadius
        ? null
        : autoApproved
          ? AttendanceApproval.APPROVED
          : AttendanceApproval.PENDING,
      approvedMode: autoApproved ? workMode : null,
      reviewedAt: autoApproved ? new Date() : null,
      reviewNote: autoApproved ? "Disetujui otomatis — absensi manager" : null,
    });
  } catch (error) {
    // Baris DB gagal dibuat — foto yang sudah ditulis ke disk jadi yatim,
    // bersihkan supaya tidak menumpuk dari absen ganda/percobaan gagal.
    await deleteUpload(photoUrl);

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
      autoApproved
        ? `Tercatat sebagai ${WORK_MODE_LABEL[workMode]} — ${formatDistance(distanceMeters)} dari ${office.name}. Otomatis disetujui.`
        : `Tercatat sebagai ${WORK_MODE_LABEL[workMode]} — ${formatDistance(distanceMeters)} dari ${office.name}. Menunggu persetujuan ${reviewerRole === Role.MANAGER ? "manager" : "supervisor"}.`,
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
 * Keputusan reviewer atas absensi luar radius: setujui (boleh menimpa mode
 * yang diklaim karyawan) atau tolak. Absensi yang ditolak dianulir — hari itu
 * dihitung Alfa, tapi barisnya tetap tersimpan sebagai jejak.
 *
 * Reviewer yang berhak ditentukan dari role pemilik absensi (lihat
 * `resolveAttendanceReviewerRole` di lib/attendance.ts) — karyawan/admin
 * direview SUPERVISOR, supervisor direview MANAGER.
 */
export async function reviewAttendance(
  attendanceId: string,
  input: z.input<typeof ReviewAttendanceSchema>,
): Promise<ReviewAttendanceResult> {
  const reviewer = await requireUser();

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

  const requiredReviewerRole = resolveAttendanceReviewerRole(
    attendance.user.role,
  );

  if (requiredReviewerRole === null || reviewer.role !== requiredReviewerRole) {
    return { ok: false, error: "Kamu tidak berhak memutuskan absensi ini" };
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
    reviewedById: reviewer.id,
    reviewNote: parsed.data.reviewNote?.trim() || null,
  });

  if (!applied) {
    return {
      ok: false,
      error: "Absensi tidak ditemukan atau sudah diputuskan reviewer lain",
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

  // Baris yang sudah ada dari HP karyawan (foto+GPS asli, termasuk klaim yang
  // masih menunggu approval) tidak boleh ditimpa diam-diam lewat form manual —
  // itu jalannya lewat menu Verifikasi. Manual hanya boleh menimpa manual.
  const existing = await AttendanceService.findByUserDateType(
    employee.id,
    workDate,
    parsed.data.type,
  );

  if (existing && !existing.isManual) {
    return {
      ok: false,
      error:
        "Absensi ini sudah tercatat dari HP karyawan. Putuskan lewat menu Verifikasi kalau masih menunggu persetujuan — jangan ditimpa di sini.",
    };
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

/** Absen pulang default kalau karyawan tidak memilih jam sendiri. */
const DEFAULT_MISSED_CHECKOUT_TIME = "17:00";

/**
 * Karyawan mengonfirmasi sendiri absen pulang yang terlewat pada hari
 * sebelumnya — dipicu dari modal yang memblokir absen masuk baru selama masih
 * ada hari yang belum diselesaikan (lihat `listUnresolvedCheckouts` di
 * `submitAttendance`).
 */
export async function confirmMissedCheckout(
  input: z.input<typeof ConfirmMissedCheckoutSchema>,
): Promise<AttendanceResult> {
  const user = await requireAnyRole(SELF_ATTENDANCE_ROLES);

  const parsed = ConfirmMissedCheckoutSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }

  const workDate = fromDateInputValue(parsed.data.workDate);

  if (!workDate) return { ok: false, error: "Tanggal tidak valid" };

  if (workDate.getTime() >= getWorkDate().getTime()) {
    return {
      ok: false,
      error: "Tanggal ini belum lewat, tidak perlu dikonfirmasi",
    };
  }

  const [checkIn, checkOut] = await Promise.all([
    AttendanceService.findByUserDateType(
      user.id,
      workDate,
      AttendanceType.CHECK_IN,
    ),
    AttendanceService.findByUserDateType(
      user.id,
      workDate,
      AttendanceType.CHECK_OUT,
    ),
  ]);

  if (!checkIn) {
    return { ok: false, error: "Tidak ada absen masuk pada tanggal itu" };
  }

  if (checkOut) {
    return { ok: false, error: "Absen pulang tanggal itu sudah tercatat" };
  }

  const time = parsed.data.time?.trim() || DEFAULT_MISSED_CHECKOUT_TIME;
  const timestamp = workDateTimeToUtc(workDate, time);

  if (!timestamp) {
    return { ok: false, error: "Jam tidak valid" };
  }

  try {
    await AttendanceService.selfConfirmCheckout({
      userId: user.id,
      workDate,
      timestamp,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "Absen pulang tanggal itu sudah tercatat" };
    }
    throw error;
  }

  revalidateAttendancePages();

  return {
    ok: true,
    message: `Absen pulang ${formatWorkDate(workDate)} dikonfirmasi pukul ${time}`,
  };
}
