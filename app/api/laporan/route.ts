import { NextResponse } from "next/server";
import { RadiusReviewStatus, Role } from "@/generated/prisma";
import { getCurrentUser } from "@/lib/session";
import { toCsv } from "@/lib/csv";
import { formatTime, formatWorkDate, toDateInputValue } from "@/lib/date";
import { LEAVE_TYPE_LABEL } from "@/lib/leave";
import { RECAP_STATUS_LABEL } from "@/lib/attendance";
import { RADIUS_REVIEW_SHORT } from "@/lib/radius-review";
import { resolveReportQuery } from "@/servers/validators/report.validator";
import { ReportService } from "@/servers/services/report.service";

/** Keterangan lokasi satu absensi — koreksi manual memang tidak punya koordinat. */
function locationLabel(
  entry: {
    isManual: boolean;
    isWithinRadius: boolean | null;
    reviewStatus: RadiusReviewStatus | null;
  } | null,
) {
  if (!entry) return "";
  if (entry.isManual) return "Koreksi manual";
  if (entry.isWithinRadius === true) return "Dalam radius";
  if (entry.isWithinRadius === false) {
    return entry.reviewStatus
      ? `Di luar radius (${RADIUS_REVIEW_SHORT[entry.reviewStatus]})`
      : "Di luar radius";
  }

  return "";
}

const HEADERS = [
  "Tanggal",
  "Nama",
  "Email",
  "Jabatan",
  "Status",
  "Keterangan",
  "Jam Masuk",
  "Jam Pulang",
  "Terlambat",
  "Lokasi Masuk",
  "Jarak Masuk (m)",
  "Lokasi Pulang",
  "Jarak Pulang (m)",
  "Pencatatan Manual",
];

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

  const rows = await ReportService.buildRecap(resolved.value);

  const csv = toCsv(
    HEADERS,
    rows.map((row) => [
      formatWorkDate(row.workDate),
      row.user.name,
      row.user.email,
      row.user.position ?? "",
      RECAP_STATUS_LABEL[row.status],
      row.leaveType ? LEAVE_TYPE_LABEL[row.leaveType] : (row.holidayName ?? ""),
      row.checkIn ? formatTime(row.checkIn.timestamp) : "",
      row.checkOut
        ? formatTime(row.checkOut.timestamp)
        : row.missingCheckOut
          ? "Tidak absen pulang"
          : "",
      row.checkIn?.isLate ? "Ya" : row.checkIn ? "Tidak" : "",
      locationLabel(row.checkIn),
      row.checkIn?.distanceMeters != null
        ? Math.round(row.checkIn.distanceMeters)
        : "",
      locationLabel(row.checkOut),
      row.checkOut?.distanceMeters != null
        ? Math.round(row.checkOut.distanceMeters)
        : "",
      row.checkIn?.isManual || row.checkOut?.isManual ? "Ya" : "",
    ]),
  );

  const filename = `rekap-absensi_${toDateInputValue(resolved.value.startDate)}_${toDateInputValue(resolved.value.endDate)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
