import { z } from "zod";
import { AttendanceType, CorrectionStatus } from "@/generated/prisma";

const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;
const TIME_INPUT = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Payload form pengajuan koreksi milik karyawan sendiri. */
export const CorrectionFormSchema = z.object({
  workDate: z.string().regex(DATE_INPUT, "Tanggal wajib diisi"),
  type: z.enum(AttendanceType),
  requestedTime: z.string().regex(TIME_INPUT, "Format jam harus HH:mm"),
  reason: z
    .string()
    .trim()
    .min(5, "Alasan minimal 5 karakter")
    .max(500, "Alasan maksimal 500 karakter"),
});

/** Sama, tapi admin memilih karyawannya. */
export const AdminCorrectionSchema = CorrectionFormSchema.extend({
  userId: z.string().min(1, "Karyawan wajib dipilih"),
});

/** Data siap simpan. */
export const CreateCorrectionSchema = z.object({
  userId: z.string().min(1),
  workDate: z.date(),
  type: z.enum(AttendanceType),
  requestedTime: z.string().regex(TIME_INPUT),
  reason: z.string().min(1),
  status: z.enum(CorrectionStatus),
  reviewedById: z.string().nullable(),
  reviewedAt: z.date().nullable(),
  reviewNote: z.string().nullable(),
});

/** Keputusan admin atas sebuah pengajuan koreksi. */
export const ReviewCorrectionSchema = z.object({
  status: z.enum([CorrectionStatus.APPROVED, CorrectionStatus.REJECTED]),
  reviewNote: z
    .string()
    .trim()
    .max(300, "Catatan maksimal 300 karakter")
    .optional()
    .or(z.literal("")),
});

export type CorrectionFormInput = z.input<typeof CorrectionFormSchema>;
export type CorrectionFormDTO = z.output<typeof CorrectionFormSchema>;
export type AdminCorrectionInput = z.input<typeof AdminCorrectionSchema>;
export type CreateCorrectionDTO = z.output<typeof CreateCorrectionSchema>;
export type ReviewCorrectionDTO = z.output<typeof ReviewCorrectionSchema>;
