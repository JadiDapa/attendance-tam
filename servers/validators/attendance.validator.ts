import { z } from "zod";
import { AttendanceType, RadiusReviewStatus } from "@/generated/prisma";

/** Payload dari form absensi (FormData → semua nilai berupa string). */
export const SubmitAttendanceSchema = z.object({
  type: z.enum(AttendanceType),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  /** Akurasi GPS yang dilaporkan perangkat, dalam meter. */
  accuracy: z.coerce
    .number()
    .min(0, "Akurasi lokasi tidak valid")
    .max(100_000, "Akurasi lokasi tidak valid"),
});

/** Data siap simpan setelah dihitung di server. */
export const CreateAttendanceSchema = SubmitAttendanceSchema.omit({
  accuracy: true,
}).extend({
  userId: z.string().min(1),
  workDate: z.date(),
  photoUrl: z.string().min(1),
  distanceMeters: z.number().nullable(),
  accuracyMeters: z.number().nullable(),
  isWithinRadius: z.boolean(),
  isLate: z.boolean(),
  /** Null kalau absensinya di dalam radius dan tidak perlu diverifikasi. */
  reviewStatus: z.enum(RadiusReviewStatus).nullable(),
});

/** Keputusan admin atas absensi di luar radius. */
export const ReviewRadiusSchema = z.object({
  status: z.enum([
    RadiusReviewStatus.VALID,
    RadiusReviewStatus.ALPA,
    RadiusReviewStatus.IZIN,
    RadiusReviewStatus.SAKIT,
  ]),
  reviewNote: z
    .string()
    .trim()
    .max(300, "Catatan maksimal 300 karakter")
    .optional()
    .or(z.literal("")),
});

export type SubmitAttendanceDTO = z.infer<typeof SubmitAttendanceSchema>;
export type CreateAttendanceDTO = z.infer<typeof CreateAttendanceSchema>;
export type ReviewRadiusDTO = z.output<typeof ReviewRadiusSchema>;
