import { z } from "zod";

const passwordField = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(72, "Password maksimal 72 karakter");

/** Data profil yang boleh diubah sendiri oleh pemilik akun. */
export const UpdateProfileSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(20, "Nomor HP maksimal 20 karakter")
    .regex(/^[0-9+\-\s]*$/, "Nomor HP hanya boleh angka")
    .optional()
    .or(z.literal("")),
});

/**
 * Nama, email, jabatan, dan role sengaja tidak ada di sini — semuanya dipakai
 * di rekap dan laporan, jadi tetap dikendalikan admin.
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Password baru harus berbeda dari password saat ini",
    path: ["newPassword"],
  });

export type UpdateProfileInput = z.input<typeof UpdateProfileSchema>;
export type UpdateProfileDTO = z.output<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.input<typeof ChangePasswordSchema>;
export type ChangePasswordDTO = z.output<typeof ChangePasswordSchema>;
