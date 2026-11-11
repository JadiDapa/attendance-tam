import { z } from "zod";

export const CreateDivisionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama divisi minimal 2 karakter")
    .max(50, "Nama divisi maksimal 50 karakter"),
});

export const UpdateDivisionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama divisi minimal 2 karakter")
    .max(50, "Nama divisi maksimal 50 karakter"),
});

export const CreatePositionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama jabatan minimal 2 karakter")
    .max(60, "Nama jabatan maksimal 60 karakter"),
  divisionId: z.string().min(1, "Divisi wajib dipilih"),
});

export const UpdatePositionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama jabatan minimal 2 karakter")
    .max(60, "Nama jabatan maksimal 60 karakter"),
  divisionId: z.string().min(1, "Divisi wajib dipilih"),
});

export type CreateDivisionDTO = z.infer<typeof CreateDivisionSchema>;
export type UpdateDivisionDTO = z.infer<typeof UpdateDivisionSchema>;
export type CreatePositionDTO = z.infer<typeof CreatePositionSchema>;
export type UpdatePositionDTO = z.infer<typeof UpdatePositionSchema>;

