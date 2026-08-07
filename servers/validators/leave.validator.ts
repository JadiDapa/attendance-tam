import { z } from "zod";
import { LeaveStatus, LeaveType } from "@/generated/prisma";

const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;

/** Payload form pengajuan (tanggal masih berupa string "YYYY-MM-DD"). */
export const LeaveFormSchema = z
  .object({
    type: z.enum(LeaveType),
    startDate: z.string().regex(DATE_INPUT, "Tanggal mulai wajib diisi"),
    endDate: z.string().regex(DATE_INPUT, "Tanggal selesai wajib diisi"),
    reason: z
      .string()
      .trim()
      .min(5, "Alasan minimal 5 karakter")
      .max(500, "Alasan maksimal 500 karakter"),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
    path: ["endDate"],
  });

/** Data siap simpan. */
export const CreateLeaveSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(LeaveType),
  startDate: z.date(),
  endDate: z.date(),
  reason: z.string().min(1),
  attachmentUrl: z.string().nullable(),
});

/** Keputusan admin atas sebuah pengajuan. */
export const ReviewLeaveSchema = z.object({
  status: z.enum([LeaveStatus.APPROVED, LeaveStatus.REJECTED]),
  reviewNote: z
    .string()
    .trim()
    .max(300, "Catatan maksimal 300 karakter")
    .optional()
    .or(z.literal("")),
});

export type LeaveFormDTO = z.infer<typeof LeaveFormSchema>;
export type CreateLeaveDTO = z.infer<typeof CreateLeaveSchema>;
export type ReviewLeaveDTO = z.infer<typeof ReviewLeaveSchema>;
