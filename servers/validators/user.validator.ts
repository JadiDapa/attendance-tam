import { z } from "zod";
import { Role } from "@/generated/prisma";

const passwordField = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(72, "Password maksimal 72 karakter");

export const CreateUserSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  email: z.email("Format email tidak valid"),
  password: passwordField,
  role: z.enum(Role).default(Role.EMPLOYEE),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s]*$/, "Nomor HP hanya boleh angka")
    .optional()
    .or(z.literal("")),
  position: z.string().trim().max(60).optional().or(z.literal("")),
});

/**
 * Password opsional saat edit — kosong berarti tidak diganti. Aktif/nonaktif
 * bukan bagian dari form ini — jalurnya `setEmployeeActive()`.
 */
export const UpdateUserSchema = CreateUserSchema.partial().extend({
  password: passwordField.optional().or(z.literal("")),
});

/**
 * Dipakai form tambah/edit karyawan. Password boleh kosong supaya form edit
 * tidak memaksa ganti password; wajib-tidaknya dicek ulang saat submit.
 */
export const EmployeeFormSchema = CreateUserSchema.extend({
  password: passwordField.optional().or(z.literal("")),
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;
export type EmployeeFormInput = z.input<typeof EmployeeFormSchema>;
export type EmployeeFormOutput = z.output<typeof EmployeeFormSchema>;
