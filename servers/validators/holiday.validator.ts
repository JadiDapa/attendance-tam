import { z } from "zod";
import { HolidayType } from "@/generated/prisma";

const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;

/** Payload form hari libur (tanggal masih string "YYYY-MM-DD"). */
export const HolidayFormSchema = z.object({
  date: z.string().regex(DATE_INPUT, "Tanggal wajib diisi"),
  name: z
    .string()
    .trim()
    .min(3, "Nama libur minimal 3 karakter")
    .max(100, "Nama libur maksimal 100 karakter"),
  type: z.enum(HolidayType).default(HolidayType.NASIONAL),
});

/** Data siap simpan. */
export const CreateHolidaySchema = z.object({
  date: z.date(),
  name: z.string().min(1),
  type: z.enum(HolidayType),
});

export type HolidayFormInput = z.input<typeof HolidayFormSchema>;
export type HolidayFormDTO = z.output<typeof HolidayFormSchema>;
export type CreateHolidayDTO = z.output<typeof CreateHolidaySchema>;
