"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import {
  OfficeLocationSchema,
  WorkScheduleSchema,
} from "@/servers/validators/setting.validator";
import {
  OfficeLocationService,
  WorkScheduleService,
} from "@/servers/services/setting.service";

export type SettingResult = { ok: true; message: string } | { ok: false; error: string };

export async function saveOfficeLocation(
  input: z.input<typeof OfficeLocationSchema>,
): Promise<SettingResult> {
  await requireRole(Role.ADMIN);

  const parsed = OfficeLocationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data lokasi tidak valid",
    };
  }

  await OfficeLocationService.save(parsed.data);

  revalidatePath("/admin/lokasi");
  revalidatePath("/dashboard");

  return { ok: true, message: "Lokasi kantor disimpan" };
}

/** Halaman yang menampilkan hari kerja / status libur & telat. */
const SCHEDULE_PATHS = [
  "/admin/waktu-kerja",
  "/admin/rekapan-karyawan",
  "/dashboard",
  "/riwayat",
];

export async function saveWorkSchedule(
  input: z.input<typeof WorkScheduleSchema>,
): Promise<SettingResult> {
  await requireRole(Role.ADMIN);

  const parsed = WorkScheduleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data waktu kerja tidak valid",
    };
  }

  await WorkScheduleService.save(parsed.data);

  for (const path of SCHEDULE_PATHS) revalidatePath(path);

  return { ok: true, message: "Waktu kerja disimpan" };
}
