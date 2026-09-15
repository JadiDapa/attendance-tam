"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { Prisma, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { fromDateInputValue } from "@/lib/date";
import {
  CreateUserSchema,
  UpdateUserSchema,
} from "@/servers/validators/user.validator";
import {
  ContactSchema,
  EmploymentDataSchema,
  PayrollSchema,
  PersonalIdentitySchema,
  TrainingSchema,
  WorkHistorySchema,
  type ContactInput,
  type EmploymentDataInput,
  type PayrollInput,
  type PersonalIdentityInput,
  type TrainingInput,
  type WorkHistoryInput,
} from "@/servers/validators/employee-profile.validator";
import { UserService } from "@/servers/services/user.service";
import {
  ContactService,
  EmploymentDataService,
  PayrollService,
  PersonalIdentityService,
  TrainingService,
  WorkHistoryService,
} from "@/servers/services/employee-profile.service";

export type UserResult = { ok: true; message: string } | { ok: false; error: string };

const DUPLICATE_EMAIL = "Email sudah dipakai karyawan lain";
const GENERIC_CLERK_ERROR = "Gagal membuat akun, silakan coba lagi";

function optional(value?: string) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

/**
 * Login sepenuhnya dikelola Clerk — baris User di Prisma cuma menyimpan
 * profil/role aplikasi, jadi tiap akun yang dibuat admin di sini juga harus
 * dibuat di Clerk (identitas & password-nya di sana).
 */
export async function createEmployee(
  input: z.input<typeof CreateUserSchema>,
): Promise<UserResult> {
  await requireRole(Role.ADMIN);

  const parsed = CreateUserSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const { name, email, password, role, phone, position } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const client = await clerkClient();

  let clerkUserId: string;

  try {
    const clerkUser = await client.users.createUser({
      emailAddress: [normalizedEmail],
      password,
      firstName: name,
    });
    clerkUserId = clerkUser.id;
  } catch {
    return { ok: false, error: GENERIC_CLERK_ERROR };
  }

  try {
    await UserService.create({
      clerkId: clerkUserId,
      name,
      email: normalizedEmail,
      role,
      phone: optional(phone),
      position: optional(position),
    });
  } catch (error) {
    // Rollback akun Clerk supaya tidak jadi akun yatim tanpa profil di database.
    await client.users.deleteUser(clerkUserId).catch(() => {});

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: DUPLICATE_EMAIL };
    }
    throw error;
  }

  revalidatePath("/admin/daftar-pekerja");
  revalidatePath("/admin/rekapan-kehadiran");

  return { ok: true, message: `Akun ${name} berhasil dibuat` };
}

export async function updateEmployee(
  userId: string,
  input: z.input<typeof UpdateUserSchema>,
): Promise<UserResult> {
  const admin = await requireRole(Role.ADMIN);

  const parsed = UpdateUserSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const { name, email, password, role, phone, position } = parsed.data;

  if (admin.id === userId && role && role !== Role.ADMIN) {
    return { ok: false, error: "Tidak bisa mengubah role akun sendiri" };
  }

  const target = await UserService.getById(userId);

  if (!target) {
    return { ok: false, error: "Karyawan tidak ditemukan" };
  }

  const client = await clerkClient();
  const normalizedEmail = email ? email.toLowerCase() : undefined;

  try {
    if (name || password) {
      await client.users.updateUser(target.clerkId, {
        ...(name ? { firstName: name } : {}),
        ...(password ? { password } : {}),
      });
    }

    if (normalizedEmail && normalizedEmail !== target.email) {
      await client.emailAddresses.createEmailAddress({
        userId: target.clerkId,
        emailAddress: normalizedEmail,
        verified: true,
        primary: true,
      });
    }
  } catch {
    return { ok: false, error: GENERIC_CLERK_ERROR };
  }

  const data: Prisma.UserUpdateInput = {};

  if (name) data.name = name;
  if (normalizedEmail) data.email = normalizedEmail;
  if (role) data.role = role;
  if (phone !== undefined) data.phone = optional(phone);
  if (position !== undefined) data.position = optional(position);

  try {
    await UserService.update(userId, data);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: DUPLICATE_EMAIL };
    }
    throw error;
  }

  revalidatePath("/admin/daftar-pekerja");
  revalidatePath(`/admin/daftar-pekerja/${userId}`);
  revalidatePath("/admin/rekapan-kehadiran");

  return { ok: true, message: "Data karyawan diperbarui" };
}

export async function setEmployeeActive(
  userId: string,
  isActive: boolean,
): Promise<UserResult> {
  const admin = await requireRole(Role.ADMIN);

  if (admin.id === userId) {
    return { ok: false, error: "Tidak bisa menonaktifkan akun sendiri" };
  }

  const target = await UserService.getById(userId);

  if (!target) {
    return { ok: false, error: "Karyawan tidak ditemukan" };
  }

  const client = await clerkClient();

  // Banned di Clerk = tidak bisa login sama sekali, sinkron dengan isActive.
  if (isActive) {
    await client.users.unbanUser(target.clerkId);
  } else {
    await client.users.banUser(target.clerkId);
  }

  await UserService.setActive(userId, isActive);

  revalidatePath("/admin/daftar-pekerja");
  revalidatePath(`/admin/daftar-pekerja/${userId}`);
  revalidatePath("/admin/rekapan-kehadiran");

  return {
    ok: true,
    message: isActive ? "Karyawan diaktifkan" : "Karyawan dinonaktifkan",
  };
}

export type ImportEmployeeRowInput = {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  position?: string;
};

export type ImportEmployeeRowResult = {
  index: number;
  email: string;
  ok: boolean;
  message: string;
};

/**
 * Impor massal dari CSV (`/admin/daftar-pekerja/impor`) — satu baris = satu
 * `createEmployee`, tapi baris yang gagal tidak menghentikan baris
 * berikutnya, jadi hasilnya dilaporkan per baris (bukan `UserResult` tunggal).
 * Validasi tiap baris tetap lewat `CreateUserSchema` yang sama supaya
 * aturannya (panjang password, format email, dst.) selalu konsisten dengan
 * form satuan.
 */
export async function importEmployees(
  rows: ImportEmployeeRowInput[],
): Promise<{ results: ImportEmployeeRowResult[] }> {
  await requireRole(Role.ADMIN);

  const client = await clerkClient();
  const results: ImportEmployeeRowResult[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const parsed = CreateUserSchema.safeParse(row);

    if (!parsed.success) {
      results.push({
        index,
        email: row.email,
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Data tidak valid",
      });
      continue;
    }

    const { name, email, password, role, phone, position } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    let clerkUserId: string;

    try {
      const clerkUser = await client.users.createUser({
        emailAddress: [normalizedEmail],
        password,
        firstName: name,
      });
      clerkUserId = clerkUser.id;
    } catch {
      results.push({
        index,
        email: normalizedEmail,
        ok: false,
        message: GENERIC_CLERK_ERROR,
      });
      continue;
    }

    try {
      await UserService.create({
        clerkId: clerkUserId,
        name,
        email: normalizedEmail,
        role,
        phone: optional(phone),
        position: optional(position),
      });
    } catch (error) {
      // Rollback akun Clerk supaya tidak jadi akun yatim tanpa profil di database.
      await client.users.deleteUser(clerkUserId).catch(() => {});

      const message =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
          ? DUPLICATE_EMAIL
          : "Gagal menyimpan data karyawan";

      results.push({ index, email: normalizedEmail, ok: false, message });
      continue;
    }

    results.push({
      index,
      email: normalizedEmail,
      ok: true,
      message: `Akun ${name} berhasil dibuat`,
    });
  }

  revalidatePath("/admin/daftar-pekerja");
  revalidatePath("/admin/rekapan-kehadiran");

  return { results };
}

export type CreateEmployeeFullInput = z.input<typeof CreateUserSchema> & {
  confirmPassword: string;
  /** Tiap bagian cuma dikirim kalau admin mengaktifkan togel "Isi sekarang". */
  personalIdentity?: PersonalIdentityInput;
  contact?: ContactInput;
  employmentData?: EmploymentDataInput;
  /** Semua field di dua bagian ini opsional — dikirim kalau ada isinya saja. */
  workHistory?: WorkHistoryInput;
  training?: TrainingInput;
  payroll?: PayrollInput;
};

/**
 * Sama seperti `createEmployee`, tapi sekaligus menerima bagian-bagian profil
 * yang opsional (identitas, kontak, kepegawaian, riwayat kerja, training,
 * penggajian) supaya admin tidak harus buka halaman profil lagi sesudahnya.
 * Dokumen administrasi & foto KTP sengaja tidak ikut di sini — keduanya
 * perlu `userId` yang baru ada setelah akun dibuat, jadi tetap lewat halaman
 * profil (lihat komentar di `employee-profile.action.ts` soal upload satu
 * berkas per request).
 */
export async function createEmployeeFull(
  input: CreateEmployeeFullInput,
): Promise<UserResult> {
  await requireRole(Role.ADMIN);

  if (input.password !== input.confirmPassword) {
    return { ok: false, error: "Konfirmasi password tidak sama" };
  }

  const core = CreateUserSchema.safeParse(input);

  if (!core.success) {
    return { ok: false, error: core.error.issues[0]?.message ?? "Data tidak valid" };
  }

  let personalIdentity: ReturnType<typeof PersonalIdentitySchema.parse> | undefined;
  let dateOfBirth: Date | null = null;

  if (input.personalIdentity) {
    const parsed = PersonalIdentitySchema.safeParse(input.personalIdentity);

    if (!parsed.success) {
      return {
        ok: false,
        error: `Identitas Pribadi: ${parsed.error.issues[0]?.message}`,
      };
    }

    dateOfBirth = fromDateInputValue(parsed.data.dateOfBirth);

    if (!dateOfBirth) {
      return { ok: false, error: "Identitas Pribadi: Tanggal lahir tidak valid" };
    }

    personalIdentity = parsed.data;
  }

  let contact: ReturnType<typeof ContactSchema.parse> | undefined;

  if (input.contact) {
    const parsed = ContactSchema.safeParse(input.contact);

    if (!parsed.success) {
      return { ok: false, error: `Kontak: ${parsed.error.issues[0]?.message}` };
    }

    contact = parsed.data;
  }

  let employmentData: ReturnType<typeof EmploymentDataSchema.parse> | undefined;
  let startDate: Date | null = null;
  let contractEndDate: Date | null = null;

  if (input.employmentData) {
    const parsed = EmploymentDataSchema.safeParse(input.employmentData);

    if (!parsed.success) {
      return {
        ok: false,
        error: `Data Kepegawaian: ${parsed.error.issues[0]?.message}`,
      };
    }

    startDate = fromDateInputValue(parsed.data.startDate);

    if (!startDate) {
      return { ok: false, error: "Data Kepegawaian: Tanggal masuk tidak valid" };
    }

    contractEndDate = parsed.data.contractEndDate
      ? fromDateInputValue(parsed.data.contractEndDate)
      : null;

    if (parsed.data.contractEndDate && !contractEndDate) {
      return {
        ok: false,
        error: "Data Kepegawaian: Tanggal berakhir kontrak tidak valid",
      };
    }

    employmentData = parsed.data;
  }

  let payroll: ReturnType<typeof PayrollSchema.parse> | undefined;

  if (input.payroll) {
    const parsed = PayrollSchema.safeParse(input.payroll);

    if (!parsed.success) {
      return { ok: false, error: `Penggajian: ${parsed.error.issues[0]?.message}` };
    }

    payroll = parsed.data;
  }

  // Riwayat pekerjaan & training seluruh field-nya opsional — cuma disimpan
  // kalau setidaknya satu field terisi, tidak butuh togel "Isi sekarang".
  const workHistoryParsed = WorkHistorySchema.safeParse(input.workHistory ?? {});
  const workHistory =
    workHistoryParsed.success &&
    Object.values(workHistoryParsed.data).some((value) => value)
      ? workHistoryParsed.data
      : undefined;

  const trainingParsed = TrainingSchema.safeParse(input.training ?? {});
  const training =
    trainingParsed.success && trainingParsed.data.trainingHistory
      ? trainingParsed.data
      : undefined;

  const { name, email, password, role, phone, position } = core.data;
  const normalizedEmail = email.toLowerCase();
  const client = await clerkClient();

  let clerkUserId: string;

  try {
    const clerkUser = await client.users.createUser({
      emailAddress: [normalizedEmail],
      password,
      firstName: name,
    });
    clerkUserId = clerkUser.id;
  } catch {
    return { ok: false, error: GENERIC_CLERK_ERROR };
  }

  let userId: string;

  try {
    const user = await UserService.create({
      clerkId: clerkUserId,
      name,
      email: normalizedEmail,
      role,
      phone: optional(phone),
      position: optional(position),
    });
    userId = user.id;
  } catch (error) {
    await client.users.deleteUser(clerkUserId).catch(() => {});

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: DUPLICATE_EMAIL };
    }
    throw error;
  }

  // Akun intinya sudah jadi — bagian profil di bawah ini best-effort supaya
  // konflik kecil (mis. NIK dobel) tidak menghapus akun yang sudah terlanjur
  // bisa dipakai login. Kegagalan di sini dilaporkan, bukan di-rollback.
  const warnings: string[] = [];

  if (personalIdentity && dateOfBirth) {
    try {
      await PersonalIdentityService.upsert(userId, {
        nik: personalIdentity.nik,
        placeOfBirth: personalIdentity.placeOfBirth,
        dateOfBirth,
        gender: personalIdentity.gender,
        religion: personalIdentity.religion,
        maritalStatus: personalIdentity.maritalStatus,
        nationality: personalIdentity.nationality,
      });
    } catch {
      warnings.push("Identitas Pribadi (NIK mungkin sudah dipakai)");
    }
  }

  if (contact) {
    try {
      await ContactService.upsert(userId, contact);
    } catch {
      warnings.push("Kontak");
    }
  }

  if (employmentData) {
    try {
      await EmploymentDataService.upsert(userId, {
        employeeNumber: employmentData.employeeNumber,
        workLocation: employmentData.workLocation,
        employmentStatus: employmentData.employmentStatus,
        startDate: startDate!,
        contractEndDate,
      });
    } catch {
      warnings.push("Data Kepegawaian (nomor induk pegawai mungkin sudah dipakai)");
    }
  }

  if (workHistory) {
    try {
      await WorkHistoryService.upsert(userId, {
        previousCompany: workHistory.previousCompany || null,
        previousPosition: workHistory.previousPosition || null,
        previousDuration: workHistory.previousDuration || null,
      });
    } catch {
      warnings.push("Riwayat Pekerjaan");
    }
  }

  if (training) {
    try {
      await TrainingService.upsert(userId, {
        trainingHistory: training.trainingHistory || null,
      });
    } catch {
      warnings.push("Training");
    }
  }

  if (payroll) {
    try {
      await PayrollService.upsert(userId, {
        baseSalary: payroll.baseSalary,
        allowance: payroll.allowance ?? null,
        bonus: payroll.bonus ?? null,
        bankAccountNumber: payroll.bankAccountNumber,
        bankAccountName: payroll.bankAccountName,
        bpjsKesehatanNumber: payroll.bpjsKesehatanNumber || null,
        bpjsKetenagakerjaanNumber: payroll.bpjsKetenagakerjaanNumber || null,
      });
    } catch {
      warnings.push("Penggajian");
    }
  }

  revalidatePath("/admin/daftar-pekerja");
  revalidatePath(`/admin/daftar-pekerja/${userId}`);
  revalidatePath("/admin/rekapan-kehadiran");

  return {
    ok: true,
    message:
      warnings.length > 0
        ? `Akun ${name} dibuat, tapi gagal menyimpan: ${warnings.join(", ")}. Lengkapi lagi lewat halaman profil.`
        : `Akun ${name} berhasil dibuat`,
  };
}
