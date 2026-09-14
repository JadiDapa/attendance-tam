import { z } from "zod";
import { AttendanceApproval, TransportationType } from "@/generated/prisma";

const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;

/** Payload pembuatan penugasan dinas luar (tanggal masih string "YYYY-MM-DD"). */
export const CreateFieldAssignmentSchema = z
  .object({
    employeeIds: z
      .array(z.string().min(1))
      .min(1, "Pilih minimal satu karyawan"),
    startDate: z.string().regex(DATE_INPUT, "Tanggal mulai wajib diisi"),
    endDate: z.string().regex(DATE_INPUT, "Tanggal selesai wajib diisi"),
    activityDetail: z
      .string()
      .trim()
      .min(5, "Kegiatan/Tujuan minimal 5 karakter")
      .max(500, "Kegiatan/Tujuan maksimal 500 karakter"),
    destinationCity: z
      .string()
      .trim()
      .min(1, "Tujuan kota wajib diisi")
      .max(200, "Tujuan kota maksimal 200 karakter"),
    destinationAddress: z
      .string()
      .trim()
      .min(1, "Lokasi/alamat tujuan wajib diisi")
      .max(500, "Lokasi/alamat tujuan maksimal 500 karakter"),
    purpose: z
      .string()
      .trim()
      .min(1, "Keperluan dinas wajib diisi")
      .max(300, "Keperluan dinas maksimal 300 karakter"),
    companyName: z
      .string()
      .trim()
      .max(200, "Nama perusahaan/instansi maksimal 200 karakter")
      .optional()
      .or(z.literal("")),
    transportation: z.enum(TransportationType, {
      error: "Transportasi wajib dipilih",
    }),
    transportationOther: z
      .string()
      .trim()
      .max(200, "Transportasi lainnya maksimal 200 karakter")
      .optional()
      .or(z.literal("")),
    estimatedCost: z.coerce
      .number({ error: "Estimasi biaya wajib diisi" })
      .int("Estimasi biaya harus bilangan bulat")
      .positive("Estimasi biaya harus lebih dari 0"),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
    path: ["endDate"],
  })
  .refine(
    (data) =>
      data.transportation !== TransportationType.LAINNYA ||
      !!data.transportationOther?.trim(),
    {
      message: "Transportasi lainnya wajib diisi",
      path: ["transportationOther"],
    },
  );

/** Keputusan manager atas sebuah pengajuan dinas luar. */
export const ReviewFieldAssignmentSchema = z.object({
  status: z.enum([AttendanceApproval.APPROVED, AttendanceApproval.REJECTED]),
  reviewNote: z
    .string()
    .trim()
    .max(300, "Catatan maksimal 300 karakter")
    .optional()
    .or(z.literal("")),
});

export type CreateFieldAssignmentInput = z.input<
  typeof CreateFieldAssignmentSchema
>;
export type CreateFieldAssignmentDTO = z.output<
  typeof CreateFieldAssignmentSchema
>;
export type ReviewFieldAssignmentDTO = z.infer<
  typeof ReviewFieldAssignmentSchema
>;
