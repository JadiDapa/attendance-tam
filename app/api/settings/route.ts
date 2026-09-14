import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import {
  OfficeLocationService,
  WorkDayService,
  WorkScheduleService,
} from "@/servers/services/setting.service";

/**
 * Data referensi read-only yang dibutuhkan mobile app sebelum/saat absen:
 * lokasi kantor (buat hitung jarak di client), toleransi telat + akurasi GPS
 * maksimal, dan jam kerja per hari. Sama seperti web, ini bukan sumber
 * keputusan akhir — server tetap menghitung ulang semuanya saat submit.
 */
export async function GET() {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const [officeLocation, workSchedule, workDays] = await Promise.all([
    OfficeLocationService.getActive(),
    WorkScheduleService.getActive(),
    WorkDayService.list(),
  ]);

  return NextResponse.json({ officeLocation, workSchedule, workDays });
}
