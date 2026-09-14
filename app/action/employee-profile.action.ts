"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@/generated/prisma";
import { requireRole, requireUser } from "@/lib/session";
import { deleteUpload, saveAttachment } from "@/lib/storage";
import { fromDateInputValue } from "@/lib/date";
import {
  ContactSchema,
  EmploymentDataSchema,
  PayrollSchema,
  PersonalIdentitySchema,
  TrainingSchema,
  WorkHistorySchema,
} from "@/servers/validators/employee-profile.validator";
import {
  AdministrativeDocumentService,
  ContactService,
  EmploymentDataService,
  PayrollService,
  PersonalIdentityService,
  TrainingService,
  WorkHistoryService,
} from "@/servers/services/employee-profile.service";

export type EmployeeProfileResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/** Employee mengedit datanya sendiri; admin boleh mengedit siapa saja lewat targetUserId. */
async function resolveTargetUserId(
  targetUserId?: string,
): Promise<{ userId: string } | { error: string }> {
  const user = await requireUser();

  if (targetUserId && targetUserId !== user.id) {
    if (user.role !== Role.ADMIN) {
      return { error: "Tidak punya akses ke data karyawan ini" };
    }

    return { userId: targetUserId };
  }

  return { userId: user.id };
}

function revalidateProfilePaths(userId: string) {
  revalidatePath("/profil");
  revalidatePath(`/admin/daftar-pekerja/${userId}`);
}

function readTargetUserId(formData: FormData): string | undefined {
  const value = formData.get("targetUserId");

  return typeof value === "string" && value ? value : undefined;
}

/** Identitas Pribadi — multipart karena ada file foto KTP opsional. */
export async function upsertPersonalIdentity(
  formData: FormData,
): Promise<EmployeeProfileResult> {
  const targetUserId = readTargetUserId(formData);
  const resolved = await resolveTargetUserId(targetUserId);

  if ("error" in resolved) return { ok: false, error: resolved.error };

  const parsed = PersonalIdentitySchema.safeParse({
    nik: formData.get("nik"),
    placeOfBirth: formData.get("placeOfBirth"),
    dateOfBirth: formData.get("dateOfBirth"),
    gender: formData.get("gender"),
    religion: formData.get("religion"),
    maritalStatus: formData.get("maritalStatus"),
    nationality: formData.get("nationality") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data identitas tidak valid",
    };
  }

  const dateOfBirth = fromDateInputValue(parsed.data.dateOfBirth);

  if (!dateOfBirth) {
    return { ok: false, error: "Tanggal lahir tidak valid" };
  }

  const photoField = formData.get("ktpPhoto");
  const photo =
    photoField instanceof File && photoField.size > 0 ? photoField : null;

  let ktpPhotoUrl: string | undefined;
  const previous = await PersonalIdentityService.getByUserId(resolved.userId);

  if (photo) {
    try {
      ktpPhotoUrl = await saveAttachment(photo);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Gagal menyimpan foto KTP",
      };
    }
  }

  try {
    await PersonalIdentityService.upsert(resolved.userId, {
      nik: parsed.data.nik,
      placeOfBirth: parsed.data.placeOfBirth,
      dateOfBirth,
      gender: parsed.data.gender,
      religion: parsed.data.religion,
      maritalStatus: parsed.data.maritalStatus,
      nationality: parsed.data.nationality,
      ...(ktpPhotoUrl ? { ktpPhotoUrl } : {}),
    });
  } catch (error) {
    if (ktpPhotoUrl) await deleteUpload(ktpPhotoUrl);

    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { ok: false, error: "NIK sudah dipakai karyawan lain" };
    }

    return { ok: false, error: "Gagal menyimpan identitas pribadi" };
  }

  if (ktpPhotoUrl && previous?.ktpPhotoUrl) {
    await deleteUpload(previous.ktpPhotoUrl);
  }

  revalidateProfilePaths(resolved.userId);

  return { ok: true, message: "Identitas pribadi disimpan" };
}

export async function upsertContact(
  input: z.input<typeof ContactSchema>,
  targetUserId?: string,
): Promise<EmployeeProfileResult> {
  const resolved = await resolveTargetUserId(targetUserId);

  if ("error" in resolved) return { ok: false, error: resolved.error };

  const parsed = ContactSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data kontak tidak valid",
    };
  }

  await ContactService.upsert(resolved.userId, parsed.data);

  revalidateProfilePaths(resolved.userId);

  return { ok: true, message: "Kontak disimpan" };
}

export async function upsertEmploymentData(
  input: z.input<typeof EmploymentDataSchema>,
  targetUserId?: string,
): Promise<EmployeeProfileResult> {
  const resolved = await resolveTargetUserId(targetUserId);

  if ("error" in resolved) return { ok: false, error: resolved.error };

  const parsed = EmploymentDataSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data kepegawaian tidak valid",
    };
  }

  const startDate = fromDateInputValue(parsed.data.startDate);

  if (!startDate) return { ok: false, error: "Tanggal masuk tidak valid" };

  const contractEndDate = parsed.data.contractEndDate
    ? fromDateInputValue(parsed.data.contractEndDate)
    : null;

  if (parsed.data.contractEndDate && !contractEndDate) {
    return { ok: false, error: "Tanggal berakhir kontrak tidak valid" };
  }

  try {
    await EmploymentDataService.upsert(resolved.userId, {
      employeeNumber: parsed.data.employeeNumber,
      workLocation: parsed.data.workLocation,
      employmentStatus: parsed.data.employmentStatus,
      startDate,
      contractEndDate,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { ok: false, error: "Nomor induk pegawai sudah dipakai karyawan lain" };
    }

    return { ok: false, error: "Gagal menyimpan data kepegawaian" };
  }

  revalidateProfilePaths(resolved.userId);

  return { ok: true, message: "Data kepegawaian disimpan" };
}

export async function upsertWorkHistory(
  input: z.input<typeof WorkHistorySchema>,
  targetUserId?: string,
): Promise<EmployeeProfileResult> {
  const resolved = await resolveTargetUserId(targetUserId);

  if ("error" in resolved) return { ok: false, error: resolved.error };

  const parsed = WorkHistorySchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data riwayat pekerjaan tidak valid",
    };
  }

  await WorkHistoryService.upsert(resolved.userId, {
    previousCompany: parsed.data.previousCompany || null,
    previousPosition: parsed.data.previousPosition || null,
    previousDuration: parsed.data.previousDuration || null,
  });

  revalidateProfilePaths(resolved.userId);

  return { ok: true, message: "Riwayat pekerjaan disimpan" };
}

export async function upsertTraining(
  input: z.input<typeof TrainingSchema>,
  targetUserId?: string,
): Promise<EmployeeProfileResult> {
  const resolved = await resolveTargetUserId(targetUserId);

  if ("error" in resolved) return { ok: false, error: resolved.error };

  const parsed = TrainingSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data training tidak valid",
    };
  }

  await TrainingService.upsert(resolved.userId, {
    trainingHistory: parsed.data.trainingHistory || null,
  });

  revalidateProfilePaths(resolved.userId);

  return { ok: true, message: "Riwayat training disimpan" };
}

/**
 * Dokumen Administrasi — multipart, PARTIAL: hanya field file yang benar-benar
 * ada di FormData yang diproses (UI mengunggah satu dokumen per submit, supaya
 * tetap di bawah batas `bodySizeLimit`). File lama dihapus kalau digantikan.
 */
const DOCUMENT_FIELDS = [
  ["ktp", "ktpUrl"],
  ["npwp", "npwpUrl"],
  ["kk", "kkUrl"],
  ["ijazah", "ijazahUrl"],
  ["transkrip", "transkripUrl"],
  ["sertifikat", "sertifikatUrl"],
  ["bankBook", "bankBookUrl"],
  ["pasFoto", "pasFotoUrl"],
  ["cv", "cvUrl"],
] as const;

export async function upsertAdministrativeDocuments(
  formData: FormData,
): Promise<EmployeeProfileResult> {
  const targetUserId = readTargetUserId(formData);
  const resolved = await resolveTargetUserId(targetUserId);

  if ("error" in resolved) return { ok: false, error: resolved.error };

  const previous = await AdministrativeDocumentService.getByUserId(
    resolved.userId,
  );

  const update: Record<string, string> = {};
  const savedUrls: string[] = [];

  for (const [field, column] of DOCUMENT_FIELDS) {
    const fileField = formData.get(field);
    const file = fileField instanceof File && fileField.size > 0 ? fileField : null;

    if (!file) continue;

    try {
      const url = await saveAttachment(file);

      update[column] = url;
      savedUrls.push(url);
    } catch (error) {
      for (const url of savedUrls) await deleteUpload(url);

      return {
        ok: false,
        error: error instanceof Error ? error.message : "Gagal menyimpan berkas",
      };
    }
  }

  if (Object.keys(update).length === 0) {
    return { ok: false, error: "Tidak ada berkas yang diunggah" };
  }

  await AdministrativeDocumentService.upsert(resolved.userId, update);

  for (const [, column] of DOCUMENT_FIELDS) {
    const newUrl = update[column];
    const oldUrl = previous?.[column as keyof typeof previous];

    if (newUrl && typeof oldUrl === "string" && oldUrl && oldUrl !== newUrl) {
      await deleteUpload(oldUrl);
    }
  }

  revalidateProfilePaths(resolved.userId);

  return { ok: true, message: "Dokumen disimpan" };
}

/** Penggajian — ADMIN ONLY. Karyawan tidak punya jalur mutasi apa pun untuk ini. */
export async function upsertPayroll(
  input: z.input<typeof PayrollSchema>,
  targetUserId: string,
): Promise<EmployeeProfileResult> {
  await requireRole(Role.ADMIN);

  if (!targetUserId) {
    return { ok: false, error: "Karyawan tujuan wajib ditentukan" };
  }

  const parsed = PayrollSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data penggajian tidak valid",
    };
  }

  await PayrollService.upsert(targetUserId, {
    baseSalary: parsed.data.baseSalary,
    allowance: parsed.data.allowance ?? null,
    bonus: parsed.data.bonus ?? null,
    bankAccountNumber: parsed.data.bankAccountNumber,
    bankAccountName: parsed.data.bankAccountName,
    bpjsKesehatanNumber: parsed.data.bpjsKesehatanNumber || null,
    bpjsKetenagakerjaanNumber: parsed.data.bpjsKetenagakerjaanNumber || null,
  });

  revalidateProfilePaths(targetUserId);

  return { ok: true, message: "Data penggajian disimpan" };
}
