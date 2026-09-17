"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { UpdateProfileSchema } from "@/servers/validators/profile.validator";
import { UserService } from "@/servers/services/user.service";
import { saveImage, deleteUpload } from "@/lib/storage";

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
 * Ganti foto profil sendiri secara manual (dipilih dari galeri/berkas) —
 * terpisah dari foto profil otomatis yang diisi dari enrollment wajah
 * pertama (lihat app/action/face.action.ts).
 */
export async function updateProfileImage(formData: FormData): Promise<ProfileResult> {
  const user = await requireUser();

  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return { ok: false, error: "Pilih foto terlebih dahulu" };
  }

  let profileImageUrl: string;

  try {
    profileImageUrl = await saveImage(photo);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan foto",
    };
  }

  await UserService.update(user.id, { profileImageUrl });

  if (user.profileImageUrl && user.profileImageUrl !== profileImageUrl) {
    await deleteUpload(user.profileImageUrl);
  }

  revalidatePath("/profil");
  revalidatePath("/dashboard");

  return { ok: true, message: "Foto profil diperbarui" };
}
