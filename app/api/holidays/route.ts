import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { HolidayService } from "@/servers/services/holiday.service";

/**
 * Hari libur (tanggal merah/cuti bersama/internal) — dipakai mobile app buat
 * kalender. Query `year` opsional (mis. `?year=2026`); tanpa itu balas semua.
 */
export async function GET(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");

  if (!yearParam) {
    const items = await HolidayService.list();
    return NextResponse.json({ items });
  }

  const year = Number(yearParam);

  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    return NextResponse.json(
      { error: "Parameter 'year' tidak valid" },
      { status: 400 },
    );
  }

  const items = await HolidayService.listInRange({
    startDate: new Date(Date.UTC(year, 0, 1)),
    endDate: new Date(Date.UTC(year, 11, 31)),
  });

  return NextResponse.json({ items });
}
