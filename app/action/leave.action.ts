"use server";

import { revalidatePath } from "next/cache";
import { ApprovalLogType, Role } from "@/generated/prisma";
import { requireAnyRole, requireUser } from "@/lib/session";
import { defaultRouteForRole } from "@/lib/role";
import {
  LEAVE_REVIEWER_STAGE,
  LEAVE_TYPE_LABEL,
  LEAVE_TYPES_REQUIRING_ATTACHMENT,
} from "@/lib/leave";
import { redirect } from "next/navigation";
import { saveAttachment, deleteUpload } from "@/lib/storage";
import { formatWorkDate, fromDateInputValue } from "@/lib/date";
import {
  LeaveFormSchema,
  ReviewLeaveSchema,
} from "@/servers/validators/leave.validator";
import { LeaveService } from "@/servers/services/leave.service";
import { ApprovalLogService } from "@/servers/services/approval-log.service";
import { LeaveStatus } from "@/generated/prisma";
import { z } from "zod";

export type LeaveResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Role yang boleh mengajukan/membatalkan izin untuk diri sendiri. Selain
 * karyawan, admin/supervisor/manager juga boleh mengajukan izinnya sendiri
 * lewat menu "Izin Saya" masing-masing — sama seperti `SELF_ATTENDANCE_ROLES`
 * di attendance.action.ts.
 */
const SELF_LEAVE_ROLES = [
  Role.EMPLOYEE,
  Role.ADMIN,
  Role.SUPERVISOR,
  Role.MANAGER,
];

export async function createLeaveRequest(
  formData: FormData,
): Promise<LeaveResult> {
  const user = await requireAnyRole(SELF_LEAVE_ROLES);

  const reasonCategoryField = formData.get("reasonCategory");

  const parsed = LeaveFormSchema.safeParse({
    type: formData.get("type"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    detail: formData.get("detail"),
    reasonCategory:
      typeof reasonCategoryField === "string" && reasonCategoryField
        ? reasonCategoryField
        : undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data pengajuan tidak valid",
    };
  }

  const attachmentField = formData.get("attachment");
  const attachment =
    attachmentField instanceof File && attachmentField.size > 0
      ? attachmentField
      : null;

  if (
    LEAVE_TYPES_REQUIRING_ATTACHMENT.includes(parsed.data.type) &&
    !attachment
  ) {
    return {
      ok: false,
      error:
        "Lampiran wajib untuk pengajuan sakit — surat keterangan dokter atau keterangan lainnya",
    };
  }

  const startDate = fromDateInputValue(parsed.data.startDate);
  const endDate = fromDateInputValue(parsed.data.endDate);

  if (!startDate || !endDate) {
    return { ok: false, error: "Tanggal pengajuan tidak valid" };
  }

  const overlapping = await LeaveService.findOverlapping(
    user.id,
    startDate,
    endDate,
  );

  if (overlapping) {
    return {
      ok: false,
      error: `Sudah ada pengajuan pada rentang tanggal itu (${formatWorkDate(overlapping.startDate)} — ${formatWorkDate(overlapping.endDate)})`,
    };
  }

  let attachmentUrl: string | null = null;

  if (attachment) {
    try {
      attachmentUrl = await saveAttachment(attachment, { compress: true });
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Gagal menyimpan lampiran",
      };
    }
  }

  const result = await LeaveService.createIfNotOverlapping({
    userId: user.id,
    type: parsed.data.type,
    startDate,
    endDate,
    detail: parsed.data.detail,
    reasonCategory: parsed.data.reasonCategory ?? null,
    attachmentUrl,
  });

  if (!result.ok) {
    // Baru ketahuan tabrakan saat commit (race dengan submit lain) —
    // lampiran yang sudah terlanjur diunggah jadi yatim, bersihkan.
    if (attachmentUrl) await deleteUpload(attachmentUrl);

    return {
      ok: false,
      error: `Sudah ada pengajuan pada rentang tanggal itu (${formatWorkDate(result.overlapping.startDate)} — ${formatWorkDate(result.overlapping.endDate)})`,
    };
  }

  revalidatePath("/izin");
  revalidatePath("/admin/izin");

  return {
    ok: true,
    message: "Pengajuan terkirim, menunggu persetujuan admin",
  };
}

/** Karyawan membatalkan pengajuannya sendiri selama belum di-review admin. */
export async function cancelLeaveRequest(
  leaveId: string,
): Promise<LeaveResult> {
  const user = await requireAnyRole(SELF_LEAVE_ROLES);

  const cancelled = await LeaveService.cancelOwn(leaveId, user.id);

  if (!cancelled) {
    return {
      ok: false,
      error: "Pengajuan tidak ditemukan atau sudah diproses admin",
    };
  }

  revalidatePath("/izin");
  revalidatePath("/admin/izin");
  revalidatePath("/admin/dashboard");

  return { ok: true, message: "Pengajuan izin dibatalkan" };
}

/**
 * Setujui/tolak pengajuan pada giliran approval reviewer yang sedang login
 * (ADMIN, SUPERVISOR, atau MANAGER — lihat REVIEWER_STAGE dan
 * `LEAVE_APPROVAL_CHAIN` di lib/leave.ts untuk urutan tiap jenis izin).
 */
export async function reviewLeaveRequest(
  leaveId: string,
  input: z.input<typeof ReviewLeaveSchema>,
): Promise<LeaveResult> {
  const reviewer = await requireUser();
  const stage = LEAVE_REVIEWER_STAGE[reviewer.role];

  if (!stage) redirect(defaultRouteForRole(reviewer.role));

  const parsed = ReviewLeaveSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Keputusan tidak valid",
    };
  }

  const leave = await LeaveService.getById(leaveId);

  const updated = await LeaveService.review(leaveId, {
    stage,
    status: parsed.data.status,
    reviewedById: reviewer.id,
    reviewNote: parsed.data.reviewNote?.trim() || null,
  });

  if (!updated) {
    return {
      ok: false,
      error: "Pengajuan tidak ditemukan atau sudah diproses lebih dulu",
    };
  }

  if (leave) {
    await ApprovalLogService.record({
      type: ApprovalLogType.LEAVE,
      requestId: leaveId,
      reviewerId: reviewer.id,
      stage: reviewer.role,
      status: parsed.data.status,
      note: parsed.data.reviewNote?.trim() || null,
      requesterId: leave.userId,
      requesterName: leave.user.name,
      summary: `${LEAVE_TYPE_LABEL[leave.type]} · ${formatWorkDate(leave.startDate)} — ${formatWorkDate(leave.endDate)}`,
    });
  }

  revalidatePath("/admin/izin");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/kehadiran");
  revalidatePath("/supervisor/izin");
  revalidatePath("/manager/izin");
  revalidatePath("/izin");

  return {
    ok: true,
    message:
      parsed.data.status === LeaveStatus.APPROVED
        ? "Pengajuan disetujui"
        : "Pengajuan ditolak",
  };
}
