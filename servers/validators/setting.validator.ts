import { z } from "zod";

const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam harus HH:mm");

export const OfficeLocationSchema = z.object({
  name: z.string().trim().min(2, "Nama lokasi minimal 2 karakter").max(100),
  latitude: z.coerce
    .number()
    .min(-90, "Latitude di luar rentang")
    .max(90, "Latitude di luar rentang"),
  longitude: z.coerce
    .number()
    .min(-180, "Longitude di luar rentang")
    .max(180, "Longitude di luar rentang"),
  radiusMeters: z.coerce
    .number()
    .int("Radius harus bilangan bulat")
    .min(10, "Radius minimal 10 meter")
    .max(5000, "Radius maksimal 5000 meter"),
});

export const WorkDaySchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    isWorkingDay: z.boolean(),
    checkInTime: timeField,
    checkOutTime: timeField,
  })
  // Hari libur tetap menyimpan jamnya, jadi jam lama kembali saat diaktifkan.
  .refine((day) => !day.isWorkingDay || day.checkOutTime > day.checkInTime, {
    message: "Jam pulang harus setelah jam masuk",
    path: ["checkOutTime"],
  });

export const WorkScheduleSchema = z
  .object({
    lateToleranceMinutes: z.coerce
      .number()
      .int()
      .min(0, "Toleransi tidak boleh negatif")
      .max(180, "Toleransi maksimal 180 menit"),
    maxAccuracyMeters: z.coerce
      .number()
      .int("Akurasi harus bilangan bulat")
      .min(10, "Akurasi minimal 10 meter")
      .max(5000, "Akurasi maksimal 5000 meter"),
    days: z.array(WorkDaySchema).length(7, "Harus mengisi 7 hari"),
  })
  .refine((data) => new Set(data.days.map((day) => day.dayOfWeek)).size === 7, {
    message: "Setiap hari hanya boleh diatur sekali",
    path: ["days"],
  })
  .refine((data) => data.days.some((day) => day.isWorkingDay), {
    message: "Minimal satu hari harus jadi hari kerja",
    path: ["days"],
  });

export type OfficeLocationDTO = z.output<typeof OfficeLocationSchema>;
export type WorkDayDTO = z.output<typeof WorkDaySchema>;
export type WorkScheduleDTO = z.output<typeof WorkScheduleSchema>;
export type OfficeLocationInput = z.input<typeof OfficeLocationSchema>;
export type WorkScheduleInput = z.input<typeof WorkScheduleSchema>;
