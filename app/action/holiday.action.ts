"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatWorkDate, fromDateInputValue } from "@/lib/date";
import { HolidayFormSchema } from "@/servers/validators/holiday.validator";
import { HolidayService } from "@/servers/services/holiday.service";

export type HolidayResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const DUPLICATE_DATE = "Tanggal itu sudah terdaftar sebagai hari libur";

/** Halaman yang ikut berubah kalau daftar libur berubah. */
const HOLIDAY_PATHS = [
  "/admin/hari-libur",
  "/admin/dashboard",
  "/admin/kehadiran",
  "/admin/rekapan-karyawan",
  "/admin/laporan",
  "/dashboard",
  "/riwayat",
];

function revalidateHolidayPages() {
  for (const path of HOLIDAY_PATHS) revalidatePath(path);
}

export async function saveHoliday(
  input: z.input<typeof HolidayFormSchema>,
  holidayId?: string,
): Promise<HolidayResult> {
  await requireRole(Role.ADMIN);

  const parsed = HolidayFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data hari libur tidak valid",
    };
  }

  const date = fromDateInputValue(parsed.data.date);

  if (!date) return { ok: false, error: "Tanggal hari libur tidak valid" };

  const data = { date, name: parsed.data.name, type: parsed.data.type };

  try {
    if (holidayId) await HolidayService.update(holidayId, data);
    else await HolidayService.create(data);
  } catch (error) {
    // Satu tanggal hanya boleh punya satu baris libur (unique pada `date`).
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: DUPLICATE_DATE };
    }
    throw error;
  }

  revalidateHolidayPages();

  return {
    ok: true,
    message: holidayId
      ? "Hari libur diperbarui"
      : `${parsed.data.name} ditambahkan pada ${formatWorkDate(date)}`,
  };
}

export async function deleteHoliday(holidayId: string): Promise<HolidayResult> {
  await requireRole(Role.ADMIN);

  try {
    await HolidayService.delete(holidayId);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { ok: false, error: "Hari libur sudah dihapus" };
    }
    throw error;
  }

  revalidateHolidayPages();

  return { ok: true, message: "Hari libur dihapus" };
}
