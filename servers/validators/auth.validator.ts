import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginDTO = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.email("Format email tidak valid"),
});

export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  code: z.string().min(6, "Kode harus 6 digit").max(6, "Kode harus 6 digit"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export type ResetPasswordDTO = z.infer<typeof ResetPasswordSchema>;
