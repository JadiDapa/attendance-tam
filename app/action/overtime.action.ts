"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ApprovalLogType,
  AttendanceApproval,
  OvertimeStage,
  Role,
} from "@/generated/prisma";
import { requireAnyRole, requireUser } from "@/lib/session";
import { defaultRouteForRole } from "@/lib/role";
import {
  addDays,
  formatDuration,
  formatTime,
  getMinutesOfDay,
  getWorkDate,
  parseTimeToMinutes,
  workDateTimeToUtc,
} from "@/lib/date";
import {
  isOvertimeStartAllowed,
  OVERTIME_REVIEWER_STAGE,
  resolveInitialOvertime,
} from "@/lib/overtime";
import {
  EndOvertimeSchema,
  ReviewOvertimeSchema,
  StartOvertimeSchema,
} from "@/servers/validators/overtime.validator";
import { OvertimeService } from "@/servers/services/overtime.service";
import { AttendanceService } from "@/servers/services/attendance.service";
import { ApprovalLogService } from "@/servers/services/approval-log.service";

export type OvertimeResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/** Halaman yang ikut berubah kalau data lembur berubah. */
const OVERTIME_PATHS = [
  "/dashboard",
  "/admin/dashboard",
  "/admin/lembur",
  "/admin/lembur-saya",
  "/supervisor/lembur",
  "/supervisor/lembur-saya",
  "/manager/lembur",
  "/manager/lembur-saya",
];

/** Role yang boleh mengajukan lembur untuk diri sendiri. */
const SELF_OVERTIME_ROLES = [
  Role.EMPLOYEE,
  Role.ADMIN,
  Role.SUPERVISOR,
  Role.MANAGER,
];

function revalidateOvertimePages() {
  for (const path of OVERTIME_PATHS) revalidatePath(path);
}

/**
 * Mulai lembur. Hanya boleh kalau absen pulang hari ini sudah tercatat, belum
 * ada sesi lembur lain yang berjalan, dan jam mulai yang dipilih >= 18:00.
 */
export async function startOvertime(
  input: z.input<typeof StartOvertimeSchema>,
): Promise<OvertimeResult> {
  const user = await requireAnyRole(SELF_OVERTIME_ROLES);

  const parsed = StartOvertimeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data lembur tidak valid",
    };
  }

  const workDate = getWorkDate();
  const status = await AttendanceService.getTodayStatus(user.id, workDate);

  if (!status.checkOut) {
    return { ok: false, error: "Absen pulang dulu sebelum mulai lembur" };
  }

  const open = await OvertimeService.getOpenForUser(user.id);

  if (open) {
    return {
      ok: false,
      error: "Kamu masih punya sesi lembur yang berjalan — selesaikan dulu",
    };
  }

  const minutesOfDay = parseTimeToMinutes(parsed.data.startTime);

  if (minutesOfDay === null) {
    return { ok: false, error: "Jam mulai lembur tidak valid" };
  }

  if (!isOvertimeStartAllowed(minutesOfDay)) {
    return {
      ok: false,
      error: "Lembur hanya bisa dimulai pukul 18:00 atau lebih larut",
    };
  }

  const startAt = workDateTimeToUtc(workDate, parsed.data.startTime);

  if (!startAt) {
    return { ok: false, error: "Jam mulai lembur tidak valid" };
  }

  const initial = resolveInitialOvertime(user.role);

  await OvertimeService.create({
    userId: user.id,
    workDate,
    startAt,
    reason: parsed.data.reason,
    stage: initial.stage,
    status: initial.status,
    reviewNote: initial.reviewNote ?? undefined,
    reviewedAt: initial.reviewedAt ?? undefined,
  });

  revalidateOvertimePages();

  return {
    ok: true,
    message: initial.message,
  };
}

/**
 * Selesaikan lembur yang sedang berjalan. `endTime` kosong berarti "sekarang";
 * kalau diisi dan jamnya lebih awal dari jam mulai, dianggap melewati tengah
 * malam (ditambahkan satu hari) supaya lembur yang menembus tengah malam tetap
 * terhitung benar.
 */
export async function endOvertime(
  input: z.input<typeof EndOvertimeSchema>,
): Promise<OvertimeResult> {
  const user = await requireAnyRole(SELF_OVERTIME_ROLES);

  const open = await OvertimeService.getOpenForUser(user.id);

  if (!open) {
    return { ok: false, error: "Belum ada lembur yang berjalan" };
  }

  const parsed = EndOvertimeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Jam selesai tidak valid",
    };
  }

  const endTime = parsed.data.endTime?.trim();
  let endAt: Date;

  if (!endTime) {
    endAt = new Date();
  } else {
    const endMinutes = parseTimeToMinutes(endTime);

    if (endMinutes === null) {
      return { ok: false, error: "Jam selesai tidak valid" };
    }

    const startWorkDate = getWorkDate(open.startAt);
    const startMinutes = getMinutesOfDay(open.startAt);
    const targetDate =
      endMinutes < startMinutes ? addDays(startWorkDate, 1) : startWorkDate;
    const resolved = workDateTimeToUtc(targetDate, endTime);

    if (!resolved) {
      return { ok: false, error: "Jam selesai tidak valid" };
    }

    endAt = resolved;
  }

  if (endAt.getTime() <= open.startAt.getTime()) {
    return {
      ok: false,
      error: "Jam selesai harus setelah jam mulai lembur",
    };
  }

  const durationMinutes = Math.round(
    (endAt.getTime() - open.startAt.getTime()) / 60_000,
  );

  const applied = await OvertimeService.end(open.id, {
    endAt,
    durationMinutes,
  });

  if (!applied) {
    return { ok: false, error: "Lembur sudah diselesaikan lebih dulu" };
  }

  revalidateOvertimePages();

  return {
    ok: true,
    message: `Lembur selesai — ${formatDuration(open.startAt, endAt) ?? ""}`.trim(),
  };
}

/**
 * Setujui/tolak pengajuan lembur pada giliran approval reviewer yang sedang
 * login (SUPERVISOR atau MANAGER — lihat `OVERTIME_REVIEWER_STAGE` dan
 * `resolveInitialOvertime` di lib/overtime.ts). Satu langkah saja: begitu
 * reviewer di giliran itu memutuskan, pengajuan langsung selesai (DONE).
 */
export async function reviewOvertime(
  overtimeId: string,
  input: z.input<typeof ReviewOvertimeSchema>,
): Promise<OvertimeResult> {
  const reviewer = await requireUser();
  const stage = OVERTIME_REVIEWER_STAGE[reviewer.role];

  if (!stage) redirect(defaultRouteForRole(reviewer.role));

  const parsed = ReviewOvertimeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Keputusan tidak valid",
    };
  }

  const finalStatus = parsed.data.status;

  const current = await OvertimeService.getById(overtimeId);

  // Ditolak sambil lembur masih berjalan (endAt null) — tutup sesinya
  // sekalian, kalau tidak akan menggantung selamanya dan memblokir
  // karyawan mulai lembur berikutnya (lihat getOpenForUser).
  let closeSession: { endAt: Date; durationMinutes: number } | undefined;

  if (finalStatus === AttendanceApproval.REJECTED && current?.endAt === null) {
    const endAt = new Date();
    closeSession = {
      endAt,
      durationMinutes: Math.max(
        0,
        Math.round((endAt.getTime() - current.startAt.getTime()) / 60_000),
      ),
    };
  }

  const applied = await OvertimeService.review(overtimeId, {
    stage,
    nextStage: OvertimeStage.DONE,
    status: finalStatus,
    reviewedById: reviewer.id,
    reviewNote: parsed.data.reviewNote?.trim() || null,
    closeSession,
  });

  if (!applied) {
    return {
      ok: false,
      error: "Pengajuan tidak ditemukan atau sudah diproses lebih dulu",
    };
  }

  if (current) {
    await ApprovalLogService.record({
      type: ApprovalLogType.OVERTIME,
      requestId: overtimeId,
      reviewerId: reviewer.id,
      stage: reviewer.role,
      status: parsed.data.status,
      note: parsed.data.reviewNote?.trim() || null,
      requesterId: current.userId,
      requesterName: current.user.name,
      summary: `Lembur ${formatTime(current.startAt)}${current.endAt ? ` — ${formatTime(current.endAt)}` : ""}`,
    });
  }

  revalidateOvertimePages();

  return {
    ok: true,
    message:
      finalStatus === AttendanceApproval.REJECTED
        ? "Pengajuan lembur ditolak"
        : "Pengajuan lembur disetujui",
  };
}
