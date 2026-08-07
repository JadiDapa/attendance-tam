"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AttendanceType, CorrectionStatus, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import {
  formatWorkDate,
  fromDateInputValue,
  getWorkDate,
  parseTimeToMinutes,
  workDateTimeToUtc,
} from "@/lib/date";
import { getWorkDayFor, isLateAt } from "@/lib/work-schedule";
import {
  AdminCorrectionSchema,
  CorrectionFormSchema,
  ReviewCorrectionSchema,
} from "@/servers/validators/correction.validator";
import {
  CorrectionService,
  type CorrectionAttendance,
} from "@/servers/services/correction.service";
import { HolidayService } from "@/servers/services/holiday.service";
import {
  WorkDayService,
  WorkScheduleService,
} from "@/servers/services/setting.service";
import { UserService } from "@/servers/services/user.service";

export type CorrectionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/** Halaman yang menampilkan absensi atau antrean koreksi. */
const CORRECTION_PATHS = [
  "/koreksi",
  "/dashboard",
  "/riwayat",
  "/admin/koreksi",
  "/admin/dashboard",
  "/admin/kehadiran",
  "/admin/rekapan-karyawan",
  "/admin/laporan",
];

function revalidateCorrectionPages() {
  for (const path of CORRECTION_PATHS) revalidatePath(path);
}

/**
 * Absensi yang akan ditulis dari sebuah koreksi. Terlambat dihitung ulang dari
 * jam yang diusulkan — bukan dari jam pengajuannya dibuat — dan hari libur
 * (mingguan maupun tanggal merah) tidak pernah dihitung terlambat.
 */
async function buildAttendance(input: {
  workDate: Date;
  type: AttendanceType;
  requestedTime: string;
}): Promise<CorrectionAttendance | null> {
  const timestamp = workDateTimeToUtc(input.workDate, input.requestedTime);
  const minutes = parseTimeToMinutes(input.requestedTime);

  if (!timestamp || minutes === null) return null;

  if (input.type === AttendanceType.CHECK_OUT) {
    return { timestamp, isLate: false };
  }

  const [schedule, workDays, holiday] = await Promise.all([
    WorkScheduleService.getActive(),
    WorkDayService.list(),
    HolidayService.getByDate(input.workDate),
  ]);

  const workDay = getWorkDayFor(input.workDate, workDays);
  const isLate =
    holiday === null &&
    isLateAt(minutes, workDay, schedule?.lateToleranceMinutes ?? 0);

  return { timestamp, isLate };
}

/** Pengajuan koreksi oleh karyawan — masuk antrean review admin. */
export async function createCorrectionRequest(
  input: z.input<typeof CorrectionFormSchema>,
): Promise<CorrectionResult> {
  const user = await requireRole(Role.EMPLOYEE);

  const parsed = CorrectionFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data koreksi tidak valid",
    };
  }

  const workDate = fromDateInputValue(parsed.data.workDate);

  if (!workDate) return { ok: false, error: "Tanggal koreksi tidak valid" };

  if (workDate.getTime() > getWorkDate().getTime()) {
    return {
      ok: false,
      error: "Tidak bisa mengajukan koreksi untuk tanggal yang belum terjadi",
    };
  }

  const pending = await CorrectionService.findPending(
    user.id,
    workDate,
    parsed.data.type,
  );

  if (pending) {
    return {
      ok: false,
      error: `Sudah ada pengajuan koreksi yang menunggu untuk ${formatWorkDate(workDate)}`,
    };
  }

  await CorrectionService.create({
    userId: user.id,
    workDate,
    type: parsed.data.type,
    requestedTime: parsed.data.requestedTime,
    reason: parsed.data.reason,
    status: CorrectionStatus.PENDING,
    reviewedById: null,
    reviewedAt: null,
    reviewNote: null,
  });

  revalidateCorrectionPages();

  return {
    ok: true,
    message: "Pengajuan koreksi terkirim, menunggu persetujuan admin",
  };
}

/** Koreksi yang dibuat langsung oleh admin — tercatat sebagai sudah disetujui. */
export async function createAdminCorrection(
  input: z.input<typeof AdminCorrectionSchema>,
): Promise<CorrectionResult> {
  const admin = await requireRole(Role.ADMIN);

  const parsed = AdminCorrectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data koreksi tidak valid",
    };
  }

  const workDate = fromDateInputValue(parsed.data.workDate);

  if (!workDate) return { ok: false, error: "Tanggal koreksi tidak valid" };

  if (workDate.getTime() > getWorkDate().getTime()) {
    return {
      ok: false,
      error: "Tidak bisa mencatat absensi untuk tanggal yang belum terjadi",
    };
  }

  const employee = await UserService.getById(parsed.data.userId);

  if (!employee || employee.role !== Role.EMPLOYEE) {
    return { ok: false, error: "Karyawan tidak ditemukan" };
  }

  const attendance = await buildAttendance({
    workDate,
    type: parsed.data.type,
    requestedTime: parsed.data.requestedTime,
  });

  if (!attendance) return { ok: false, error: "Jam koreksi tidak valid" };

  await CorrectionService.createApproved(
    {
      userId: employee.id,
      workDate,
      type: parsed.data.type,
      requestedTime: parsed.data.requestedTime,
      reason: parsed.data.reason,
      status: CorrectionStatus.APPROVED,
      reviewedById: admin.id,
      reviewedAt: new Date(),
      reviewNote: null,
    },
    attendance,
  );

  revalidateCorrectionPages();

  return {
    ok: true,
    message: `Absensi ${employee.name} pada ${formatWorkDate(workDate)} dicatat`,
  };
}

/** Keputusan admin atas pengajuan koreksi karyawan. */
export async function reviewCorrectionRequest(
  correctionId: string,
  input: z.input<typeof ReviewCorrectionSchema>,
): Promise<CorrectionResult> {
  const admin = await requireRole(Role.ADMIN);

  const parsed = ReviewCorrectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Keputusan tidak valid",
    };
  }

  const correction = await CorrectionService.getById(correctionId);

  if (!correction) {
    return { ok: false, error: "Pengajuan koreksi tidak ditemukan" };
  }

  const reviewNote = parsed.data.reviewNote?.trim() || null;
  let applied: boolean;

  if (parsed.data.status === CorrectionStatus.REJECTED) {
    applied = await CorrectionService.reject(correctionId, {
      reviewedById: admin.id,
      reviewNote,
    });
  } else {
    const attendance = await buildAttendance({
      workDate: correction.workDate,
      type: correction.type,
      requestedTime: correction.requestedTime,
    });

    if (!attendance) return { ok: false, error: "Jam koreksi tidak valid" };

    applied = await CorrectionService.approve(correctionId, {
      reviewedById: admin.id,
      reviewNote,
      attendance,
    });
  }

  if (!applied) {
    return {
      ok: false,
      error: "Pengajuan tidak ditemukan atau sudah diproses admin lain",
    };
  }

  revalidateCorrectionPages();

  return {
    ok: true,
    message:
      parsed.data.status === CorrectionStatus.APPROVED
        ? "Koreksi disetujui dan absensi diperbarui"
        : "Pengajuan koreksi ditolak",
  };
}

/** Karyawan membatalkan pengajuannya sendiri selama belum di-review. */
export async function cancelCorrectionRequest(
  correctionId: string,
): Promise<CorrectionResult> {
  const user = await requireRole(Role.EMPLOYEE);

  const cancelled = await CorrectionService.cancelOwn(correctionId, user.id);

  if (!cancelled) {
    return {
      ok: false,
      error: "Pengajuan tidak ditemukan atau sudah diproses admin",
    };
  }

  revalidateCorrectionPages();

  return { ok: true, message: "Pengajuan koreksi dibatalkan" };
}
