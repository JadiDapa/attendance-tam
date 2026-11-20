import { z } from "zod";
import { Role } from "@/generated/prisma";
import { canHavePosition, normalizePositionId } from "@/lib/division";

const passwordField = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(72, "Password maksimal 72 karakter");

const positionIdField = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform(normalizePositionId);

const refineManagerNoPosition = <
  T extends { role?: Role; positionId?: string | null },
>(
  data: T,
  ctx: z.RefinementCtx,
) => {
  if (!canHavePosition(data.role) && data.positionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Manager tidak punya Jabatan maupun Divisi",
      path: ["positionId"],
    });
  }
};

const BaseUserSchema = z.object({
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
  positionId: positionIdField,
});

export const CreateUserSchema = BaseUserSchema.superRefine(refineManagerNoPosition);

/**
 * Password opsional saat edit — kosong berarti tidak diganti. Aktif/nonaktif
 * bukan bagian dari form ini — jalurnya `setEmployeeActive()`.
 */
export const UpdateUserSchema = BaseUserSchema.partial()
  .extend({
    password: passwordField.optional().or(z.literal("")),
  })
  .superRefine(refineManagerNoPosition);

/**
 * Dipakai form tambah/edit karyawan. Password boleh kosong supaya form edit
 * tidak memaksa ganti password; wajib-tidaknya dicek ulang saat submit.
 */
export const EmployeeFormSchema = BaseUserSchema.extend({
  password: passwordField.optional().or(z.literal("")),
}).superRefine(refineManagerNoPosition);

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;
export type EmployeeFormInput = z.input<typeof EmployeeFormSchema>;
export type EmployeeFormOutput = z.output<typeof EmployeeFormSchema>;
