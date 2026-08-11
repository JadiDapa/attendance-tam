"use server";

import { revalidatePath } from "next/cache";
import {
  AttendanceType,
  Prisma,
  RadiusReviewStatus,
  Role,
} from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { saveImage } from "@/lib/storage";
import { haversineDistance, formatDistance } from "@/lib/geo";
import { getMinutesOfDay, getWorkDate } from "@/lib/date";
import { z } from "zod";
import {
  ReviewRadiusSchema,
  SubmitAttendanceSchema,
} from "@/servers/validators/attendance.validator";
import { RADIUS_REVIEW_LABEL } from "@/lib/radius-review";
import { AttendanceService } from "@/servers/services/attendance.service";
import {
  OfficeLocationService,
  WorkDayService,
  WorkScheduleService,
} from "@/servers/services/setting.service";
import { HolidayService } from "@/servers/services/holiday.service";
import { FaceService } from "@/servers/services/face.service";
import { verifyFace, FaceApiError } from "@/lib/face-recognition";
import { getWorkDayFor, isLateAt } from "@/lib/work-schedule";

export type AttendanceResult =
  | { ok: true; message: string; warning?: string }
  | { ok: false; error: string };

export type ReviewRadiusResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/** Halaman yang ikut berubah kalau keputusan verifikasi radius berubah. */
const REVIEW_PATHS = [
  "/admin/verifikasi",
  "/admin/dashboard",
  "/admin/kehadiran",
  "/admin/rekapan-karyawan",
  "/admin/laporan",
  "/dashboard",
  "/riwayat",
];

/**
 * Keputusan admin atas absensi yang terekam di luar radius kantor.
 * Menentukan apakah absensi itu dihitung hadir, dianulir, atau jadi izin/sakit.
 */
export async function reviewAttendanceRadius(
  attendanceId: string,
  input: z.input<typeof ReviewRadiusSchema>,
): Promise<ReviewRadiusResult> {
  const admin = await requireRole(Role.ADMIN);

  const parsed = ReviewRadiusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Keputusan tidak valid",
    };
  }

  const applied = await AttendanceService.review(attendanceId, {
    status: parsed.data.status,
    reviewedById: admin.id,
    reviewNote: parsed.data.reviewNote?.trim() || null,
  });

  if (!applied) {
    return {
      ok: false,
      error: "Absensi tidak ditemukan atau sudah diverifikasi admin lain",
    };
  }

  for (const path of REVIEW_PATHS) revalidatePath(path);

  return {
    ok: true,
    message: `Absensi ditandai: ${RADIUS_REVIEW_LABEL[parsed.data.status].toLowerCase()}`,
  };
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
  });

  if (!parsed.success) {
    return { ok: false, error: "Data absensi tidak valid" };
  }

  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return { ok: false, error: "Foto absensi wajib diambil" };
  }

  // Verifikasi 1:1: pastikan foto ini benar wajah pemilik akun yang sedang
  // login (anti titip absen) — bukan pencarian di antara semua karyawan,
  // karena siapa yang absen sudah diketahui dari sesi login.
  const referenceEmbeddings = await FaceService.listByUser(user.id);

  if (referenceEmbeddings.length < FaceService.minEnrollmentPhotos) {
    return {
      ok: false,
      error:
        "Wajah kamu belum terdaftar. Lengkapi pendaftaran wajah di halaman Profil terlebih dahulu.",
    };
  }

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

  const { type, latitude, longitude, accuracy } = parsed.data;
  const now = new Date();
  const workDate = getWorkDate(now);

  const [status, office, schedule, workDays, holiday] = await Promise.all([
    AttendanceService.getTodayStatus(user.id, workDate),
    OfficeLocationService.getActive(),
    WorkScheduleService.getActive(),
    WorkDayService.list(),
    HolidayService.getByDate(workDate),
  ]);

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
  // ke kantor jadi tidak bermakna dan verifikasi radius ikut tidak bisa
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

  // Telat hanya relevan untuk absen masuk di hari kerja — absen di hari libur
  // mingguan maupun tanggal merah tetap diterima (mis. lembur) tapi tidak
  // pernah dihitung terlambat.
  const workDay = getWorkDayFor(workDate, workDays);
  const toleranceMinutes = schedule?.lateToleranceMinutes ?? 0;
  const isLate =
    type === AttendanceType.CHECK_IN &&
    holiday === null &&
    isLateAt(getMinutesOfDay(now), workDay, toleranceMinutes);

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
      // Di luar radius tidak langsung dihitung hadir — masuk antrean verifikasi
      // admin dulu supaya angka rekap tidak berubah surut setelah ditinjau.
      reviewStatus: isWithinRadius ? null : RadiusReviewStatus.PENDING,
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

  revalidatePath("/dashboard");
  revalidatePath("/riwayat");
  revalidatePath("/koreksi");
  revalidatePath("/admin/verifikasi");

  const isCheckIn = type === AttendanceType.CHECK_IN;
  const warnings: string[] = [];

  if (!isWithinRadius) {
    warnings.push(
      `Lokasi kamu ${formatDistance(distanceMeters)} dari ${office.name} (di luar radius ${office.radiusMeters} m). Absensi tersimpan tapi menunggu verifikasi admin sebelum dihitung hadir.`,
    );
  }

  if (isLate) {
    warnings.push(
      `Tercatat terlambat dari jam masuk ${workDay.checkInTime} (toleransi ${toleranceMinutes} menit).`,
    );
  }

  return {
    ok: true,
    message: isCheckIn ? "Absen masuk tercatat" : "Absen pulang tercatat",
    warning: warnings.length ? warnings.join(" ") : undefined,
  };
}
