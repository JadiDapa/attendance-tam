"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { saveAttachment } from "@/lib/storage";
import { formatWorkDate, fromDateInputValue } from "@/lib/date";
import {
  LeaveFormSchema,
  ReviewLeaveSchema,
} from "@/servers/validators/leave.validator";
import { LeaveService } from "@/servers/services/leave.service";
import { LeaveStatus } from "@/generated/prisma";
import { z } from "zod";

export type LeaveResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createLeaveRequest(
  formData: FormData,
): Promise<LeaveResult> {
  const user = await requireRole(Role.EMPLOYEE);

  const parsed = LeaveFormSchema.safeParse({
    type: formData.get("type"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data pengajuan tidak valid",
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

  const attachment = formData.get("attachment");
  let attachmentUrl: string | null = null;

  if (attachment instanceof File && attachment.size > 0) {
    try {
      attachmentUrl = await saveAttachment(attachment);
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Gagal menyimpan lampiran",
      };
    }
  }

  await LeaveService.create({
    userId: user.id,
    type: parsed.data.type,
    startDate,
    endDate,
    reason: parsed.data.reason,
    attachmentUrl,
  });

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
  const user = await requireRole(Role.EMPLOYEE);

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

export async function reviewLeaveRequest(
  leaveId: string,
  input: z.input<typeof ReviewLeaveSchema>,
): Promise<LeaveResult> {
  const admin = await requireRole(Role.ADMIN);

  const parsed = ReviewLeaveSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Keputusan tidak valid",
    };
  }

  const updated = await LeaveService.review(leaveId, {
    status: parsed.data.status,
    reviewedById: admin.id,
    reviewNote: parsed.data.reviewNote?.trim() || null,
  });

  if (!updated) {
    return {
      ok: false,
      error: "Pengajuan tidak ditemukan atau sudah diproses admin lain",
    };
  }

  revalidatePath("/admin/izin");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/kehadiran");
  revalidatePath("/izin");

  return {
    ok: true,
    message:
      parsed.data.status === LeaveStatus.APPROVED
        ? "Pengajuan disetujui"
        : "Pengajuan ditolak",
  };
}
