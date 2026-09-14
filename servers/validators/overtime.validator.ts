import { z } from "zod";
import { AttendanceApproval } from "@/generated/prisma";

const TIME_INPUT = /^\d{1,2}:\d{2}$/;

/** Payload mulai lembur — `startTime` "HH:mm" pada hari kerja berjalan. */
export const StartOvertimeSchema = z.object({
  startTime: z.string().regex(TIME_INPUT, "Jam mulai lembur wajib diisi"),
  reason: z
    .string()
    .trim()
    .min(5, "Alasan minimal 5 karakter")
    .max(500, "Alasan maksimal 500 karakter"),
});

/** Payload selesai lembur — `endTime` kosong berarti "sekarang". */
export const EndOvertimeSchema = z.object({
  endTime: z
    .string()
    .regex(TIME_INPUT, "Format jam tidak valid")
    .optional()
    .or(z.literal("")),
});

/** Keputusan admin/supervisor atas sebuah pengajuan lembur. */
export const ReviewOvertimeSchema = z.object({
  status: z.enum([AttendanceApproval.APPROVED, AttendanceApproval.REJECTED]),
  reviewNote: z
    .string()
    .trim()
    .max(300, "Catatan maksimal 300 karakter")
    .optional()
    .or(z.literal("")),
});

export type StartOvertimeDTO = z.infer<typeof StartOvertimeSchema>;
export type EndOvertimeDTO = z.infer<typeof EndOvertimeSchema>;
export type ReviewOvertimeDTO = z.infer<typeof ReviewOvertimeSchema>;
