"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import {
  CreateUserSchema,
  UpdateUserSchema,
} from "@/servers/validators/user.validator";
import { UserService } from "@/servers/services/user.service";

export type UserResult = { ok: true; message: string } | { ok: false; error: string };

const DUPLICATE_EMAIL = "Email sudah dipakai karyawan lain";

function optional(value?: string) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export async function createEmployee(
  input: z.input<typeof CreateUserSchema>,
): Promise<UserResult> {
  await requireRole(Role.ADMIN);

  const parsed = CreateUserSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const { name, email, password, role, phone, position } = parsed.data;

  try {
    await UserService.create({
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      role,
      phone: optional(phone),
      position: optional(position),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: DUPLICATE_EMAIL };
    }
    throw error;
  }

  revalidatePath("/admin/rekapan-karyawan");

  return { ok: true, message: `Akun ${name} berhasil dibuat` };
}

export async function updateEmployee(
  userId: string,
  input: z.input<typeof UpdateUserSchema>,
): Promise<UserResult> {
  await requireRole(Role.ADMIN);

  const parsed = UpdateUserSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const { name, email, password, role, phone, position } = parsed.data;
  const data: Prisma.UserUpdateInput = {};

  if (name) data.name = name;
  if (email) data.email = email.toLowerCase();
  if (role) data.role = role;
  if (phone !== undefined) data.phone = optional(phone);
  if (position !== undefined) data.position = optional(position);
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

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

  revalidatePath("/admin/rekapan-karyawan");

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

  await UserService.setActive(userId, isActive);

  revalidatePath("/admin/rekapan-karyawan");

  return {
    ok: true,
    message: isActive ? "Karyawan diaktifkan" : "Karyawan dinonaktifkan",
  };
}
