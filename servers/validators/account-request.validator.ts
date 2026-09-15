import { z } from "zod";
import { Role } from "@/generated/prisma";

/** Diisi pemohon (mobile app, belum punya akun) — publik, tanpa auth. */
export const CreateAccountRequestSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
    email: z.email("Format email tidak valid"),
    phone: z
      .string()
      .trim()
      .max(20)
      .regex(/^[0-9+\-\s]*$/, "Nomor HP hanya boleh angka")
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(72, "Password maksimal 72 karakter"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak sama",
    path: ["confirmPassword"],
  });

/** Diisi admin saat meninjau — role boleh diganti dari default EMPLOYEE. */
export const ReviewAccountRequestSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  role: z.enum(Role).default(Role.EMPLOYEE),
  reviewNote: z.string().trim().max(300).optional().or(z.literal("")),
});

export type CreateAccountRequestDTO = z.infer<typeof CreateAccountRequestSchema>;
export type ReviewAccountRequestDTO = z.infer<typeof ReviewAccountRequestSchema>;
