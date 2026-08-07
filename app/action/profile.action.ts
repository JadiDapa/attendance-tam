"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import {
  ChangePasswordSchema,
  UpdateProfileSchema,
} from "@/servers/validators/profile.validator";
import { UserService } from "@/servers/services/user.service";

export type ProfileResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function updateProfile(
  input: z.input<typeof UpdateProfileSchema>,
): Promise<ProfileResult> {
  const user = await requireUser();

  const parsed = UpdateProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data profil tidak valid",
    };
  }

  const phone = parsed.data.phone?.trim();

  await UserService.update(user.id, { phone: phone ? phone : null });

  revalidatePath("/profil");
  revalidatePath("/dashboard");

  return { ok: true, message: "Profil diperbarui" };
}

/**
 * Ganti password sendiri. Password lama wajib benar supaya sesi yang tertinggal
 * di perangkat lain tidak bisa dipakai mengambil alih akun.
 */
export async function changePassword(
  input: z.input<typeof ChangePasswordSchema>,
): Promise<ProfileResult> {
  const user = await requireUser();

  const parsed = ChangePasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data password tidak valid",
    };
  }

  const passwordMatch = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash,
  );

  if (!passwordMatch) {
    return { ok: false, error: "Password saat ini salah" };
  }

  await UserService.update(user.id, {
    passwordHash: await bcrypt.hash(parsed.data.newPassword, 10),
  });

  revalidatePath("/profil");

  return { ok: true, message: "Password berhasil diganti" };
}
