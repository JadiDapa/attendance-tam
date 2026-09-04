"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { defaultRouteForRole } from "@/auth.config";
import { LoginSchema } from "@/servers/validators/auth.validator";
import { UserService } from "@/servers/services/user.service";

export type LoginResult = { ok: true; redirectTo: string } | { ok: false; error: string };

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email atau password salah",
  inactive_account: "Akun Anda sudah dinonaktifkan. Hubungi admin.",
};

export async function login(
  input: z.input<typeof LoginSchema>,
): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Email atau password salah" };
  }

  const email = parsed.data.email.toLowerCase();

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const code = "code" in error ? String(error.code) : "";
      return {
        ok: false,
        error: ERROR_MESSAGES[code] ?? "Gagal masuk, silakan coba lagi",
      };
    }
    throw error;
  }

  // Session sudah terbentuk di sini; ambil role untuk menentukan halaman tujuan.
  const user = await UserService.getByEmail(email);

  return {
    ok: true,
    redirectTo: user ? defaultRouteForRole(user.role) : "/dashboard",
  };
}

