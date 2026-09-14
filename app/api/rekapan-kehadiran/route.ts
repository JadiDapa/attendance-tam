import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatWorkDate, toDateInputValue } from "@/lib/date";
import { buildMonthlyAttendanceWorkbook } from "@/lib/monthly-report-xlsx";
import { resolveReportQuery } from "@/servers/validators/report.validator";
import { MonthlyReportService } from "@/servers/services/monthly-report.service";

export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const url = new URL(req.url);
  const resolved = resolveReportQuery(Object.fromEntries(url.searchParams));

  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const { startDate, endDate } = resolved.value;

  const rows = await MonthlyReportService.buildAttendanceRecap({
    startDate,
    endDate,
  });

  const periodLabel = `${formatWorkDate(startDate)} – ${formatWorkDate(endDate)}`;
  const buffer = await buildMonthlyAttendanceWorkbook({ periodLabel, rows });

  const filename = `rekap-absensi_${toDateInputValue(startDate)}_${toDateInputValue(endDate)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
