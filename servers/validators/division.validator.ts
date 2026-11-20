import { z } from "zod";

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `Nama ${label} minimal 2 karakter`)
    // Sama dengan batas `User.position` di form pekerja, karena nama Jabatan
    // disalin ke kolom itu.
    .max(60, `Nama ${label} maksimal 60 karakter`);

export const DivisionFormSchema = z.object({
  name: nameField("Divisi"),
});

export const PositionFormSchema = z.object({
  name: nameField("Jabatan"),
  divisionId: z.string().min(1, "Divisi wajib dipilih"),
});

export const RenamePositionSchema = PositionFormSchema.pick({ name: true });

/** `positionId` null = kosongkan Jabatan (kolom teks `User.position` dibiarkan). */
export const AssignPositionSchema = z.object({
  userId: z.string().min(1),
  positionId: z.string().min(1).nullable(),
});

export type DivisionDTO = z.output<typeof DivisionFormSchema>;
export type PositionDTO = z.output<typeof PositionFormSchema>;
export type AssignPositionDTO = z.output<typeof AssignPositionSchema>;
