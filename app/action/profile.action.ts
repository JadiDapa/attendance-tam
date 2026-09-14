"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { UpdateProfileSchema } from "@/servers/validators/profile.validator";
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
