import { z } from "zod";
import { LeaveReasonCategory, LeaveType, LeaveStatus } from "@/generated/prisma";
import {
  CUTI_MIN_ADVANCE_DAYS,
  IZIN_MIN_ADVANCE_DAYS,
  LEAVE_REASON_CATEGORIES_BY_TYPE,
  minCutiStartDateInputValue,
  minIzinStartDateInputValue,
} from "@/lib/leave";

const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;

/** Payload form pengajuan (tanggal masih berupa string "YYYY-MM-DD"). */
export const LeaveFormSchema = z
  .object({
    type: z.enum(LeaveType),
    startDate: z.string().regex(DATE_INPUT, "Tanggal mulai wajib diisi"),
    endDate: z.string().regex(DATE_INPUT, "Tanggal selesai wajib diisi"),
    detail: z
      .string()
      .trim()
      .min(5, "Detail minimal 5 karakter")
      .max(500, "Detail maksimal 500 karakter"),
    /** "Alasan" — wajib untuk CUTI/IZIN (lihat superRefine di bawah), harus
     * kosong untuk SAKIT. */
    reasonCategory: z.enum(LeaveReasonCategory).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
    path: ["endDate"],
  })
  .refine(
    (data) => data.type !== LeaveType.CUTI || data.startDate >= minCutiStartDateInputValue(),
    {
      message: `Cuti wajib diajukan minimal ${CUTI_MIN_ADVANCE_DAYS} hari sebelum tanggal mulai`,
      path: ["startDate"],
    },
  )
  .refine(
    (data) => data.type !== LeaveType.IZIN || data.startDate >= minIzinStartDateInputValue(),
    {
      message: `Izin wajib diajukan minimal ${IZIN_MIN_ADVANCE_DAYS} hari sebelum tanggal mulai`,
      path: ["startDate"],
    },
  )
  .superRefine((data, ctx) => {
    const allowedCategories = LEAVE_REASON_CATEGORIES_BY_TYPE[data.type];

    if (!allowedCategories) {
      // SAKIT: tidak punya kategori sama sekali.
      if (data.reasonCategory !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Sakit tidak memakai kategori alasan",
          path: ["reasonCategory"],
        });
      }
      return;
    }

    if (
      data.reasonCategory === undefined ||
      !allowedCategories.includes(data.reasonCategory)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Alasan wajib dipilih",
        path: ["reasonCategory"],
      });
    }
  });

/** Data siap simpan. */
export const CreateLeaveSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(LeaveType),
  startDate: z.date(),
  endDate: z.date(),
  detail: z.string().min(1),
  reasonCategory: z.enum(LeaveReasonCategory).nullable(),
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
