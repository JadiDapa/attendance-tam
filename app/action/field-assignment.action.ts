"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApprovalLogType, Role, TransportationType } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { saveAttachment, deleteUpload } from "@/lib/storage";
import { formatWorkDate, fromDateInputValue } from "@/lib/date";
import {
  CreateFieldAssignmentSchema,
  ReviewFieldAssignmentSchema,
} from "@/servers/validators/field-assignment.validator";
import { FieldAssignmentService } from "@/servers/services/field-assignment.service";
import { UserService } from "@/servers/services/user.service";
import { ApprovalLogService } from "@/servers/services/approval-log.service";

export type FieldAssignmentResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/** Halaman yang ikut berubah kalau data dinas luar berubah. */
const FIELD_ASSIGNMENT_PATHS = [
  "/dashboard",
  "/riwayat",
  "/supervisor/dinas-luar",
  "/admin/dinas-luar",
  "/admin/dashboard",
  "/admin/laporan",
  "/admin/kehadiran",
  "/admin/rekapan-kehadiran",
];

function revalidateFieldAssignmentPages() {
  for (const path of FIELD_ASSIGNMENT_PATHS) revalidatePath(path);
}

export async function createFieldAssignment(
  formData: FormData,
): Promise<FieldAssignmentResult> {
  const user = await requireRole(Role.SUPERVISOR);

  const parsed = CreateFieldAssignmentSchema.safeParse({
    employeeIds: formData.getAll("employeeIds"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    activityDetail: formData.get("activityDetail"),
    destinationCity: formData.get("destinationCity"),
    destinationAddress: formData.get("destinationAddress"),
    purpose: formData.get("purpose"),
    companyName: formData.get("companyName") ?? undefined,
    transportation: formData.get("transportation"),
    transportationOther: formData.get("transportationOther") ?? undefined,
    estimatedCost: formData.get("estimatedCost"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data penugasan tidak valid",
    };
  }

  const attachment = formData.get("attachment");

  if (!(attachment instanceof File) || attachment.size === 0) {
    return { ok: false, error: "Lampiran surat tugas wajib diunggah" };
  }

  const startDate = fromDateInputValue(parsed.data.startDate);
  const endDate = fromDateInputValue(parsed.data.endDate);

  if (!startDate || !endDate) {
    return { ok: false, error: "Tanggal tidak valid" };
  }

  // Karyawan yang dipilih harus benar-benar EMPLOYEE aktif — dicek di server,
  // bukan cuma dipercaya dari pilihan client.
  const uniqueIds = [...new Set(parsed.data.employeeIds)];
  const employees = await Promise.all(
    uniqueIds.map((id) => UserService.getById(id)),
  );
  const invalid = employees.some(
    (employee) =>
      !employee || employee.role !== Role.EMPLOYEE || !employee.isActive,
  );

  if (invalid) {
    return {
      ok: false,
      error: "Salah satu karyawan yang dipilih tidak valid atau tidak aktif",
    };
  }

  let attachmentUrl: string;

  try {
    attachmentUrl = await saveAttachment(attachment, { compress: true });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan lampiran",
    };
  }

  try {
    await FieldAssignmentService.create({
      createdById: user.id,
      employeeIds: uniqueIds,
      startDate,
      endDate,
      activityDetail: parsed.data.activityDetail,
      destinationCity: parsed.data.destinationCity,
      destinationAddress: parsed.data.destinationAddress,
      purpose: parsed.data.purpose,
      companyName: parsed.data.companyName?.trim() || null,
      transportation: parsed.data.transportation,
      transportationOther:
        parsed.data.transportation === TransportationType.LAINNYA
          ? parsed.data.transportationOther?.trim() || null
          : null,
      estimatedCost: parsed.data.estimatedCost,
      attachmentUrl,
    });
  } catch (error) {
    await deleteUpload(attachmentUrl);
    throw error;
  }

  revalidateFieldAssignmentPages();

  return {
    ok: true,
    message: "Penugasan dinas luar terkirim, menunggu persetujuan admin",
  };
}

/** Supervisor membatalkan pengajuannya sendiri selama belum di-review admin. */
export async function cancelFieldAssignment(
  fieldAssignmentId: string,
): Promise<FieldAssignmentResult> {
  const user = await requireRole(Role.SUPERVISOR);

  const cancelled = await FieldAssignmentService.cancelOwn(
    fieldAssignmentId,
    user.id,
  );

  if (!cancelled) {
    return {
      ok: false,
      error: "Pengajuan tidak ditemukan atau sudah diproses admin",
    };
  }

  revalidateFieldAssignmentPages();

  return { ok: true, message: "Pengajuan dinas luar dibatalkan" };
}

/** Setujui/tolak pengajuan dinas luar — satu langkah, hanya admin. */
export async function reviewFieldAssignment(
  fieldAssignmentId: string,
  input: z.input<typeof ReviewFieldAssignmentSchema>,
): Promise<FieldAssignmentResult> {
  const admin = await requireRole(Role.ADMIN);

  const parsed = ReviewFieldAssignmentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Keputusan tidak valid",
    };
  }

  const current = await FieldAssignmentService.getById(fieldAssignmentId);

  const applied = await FieldAssignmentService.decide(fieldAssignmentId, {
    status: parsed.data.status,
    reviewedById: admin.id,
    reviewNote: parsed.data.reviewNote?.trim() || null,
  });

  if (!applied) {
    return {
      ok: false,
      error: "Pengajuan tidak ditemukan atau sudah diproses lebih dulu",
    };
  }

  if (current) {
    await ApprovalLogService.record({
      type: ApprovalLogType.FIELD_ASSIGNMENT,
      requestId: fieldAssignmentId,
      reviewerId: admin.id,
      stage: admin.role,
      status: parsed.data.status,
      note: parsed.data.reviewNote?.trim() || null,
      requesterId: current.createdById,
      requesterName: current.createdBy.name,
      summary: `Dinas Luar ${current.destinationCity ?? ""} · ${formatWorkDate(current.startDate)} — ${formatWorkDate(current.endDate)}`,
    });
  }

  revalidateFieldAssignmentPages();

  return {
    ok: true,
    message:
      parsed.data.status === "APPROVED"
        ? "Penugasan dinas luar disetujui"
        : "Penugasan dinas luar ditolak",
  };
}
