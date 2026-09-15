import Link from "next/link";
import {
  CheckCircledIcon as CheckCircle2,
  CrossCircledIcon as UserX,
  DownloadIcon as Download,
  ArrowTopRightIcon as TrendingUp,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import DateRangeNav from "@/components/dashboard/DateRangeNav";
import Panel from "@/components/dashboard/Panel";
import StatTile from "@/components/dashboard/StatTile";
import AttendanceStatusChart from "@/components/dashboard/AttendanceStatusChart";
import AttendanceSummaryTable, {
  type AttendanceSummaryRow,
} from "@/components/admin/AttendanceSummaryTable";
import { Button } from "@/components/ui/button";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { resolveAttendanceRange } from "@/lib/attendance-days";
import { formatWorkDate, getWorkDate, toDateInputValue } from "@/lib/date";
import { ReportService } from "@/servers/services/report.service";
import { UserService } from "@/servers/services/user.service";

type SearchParams = { start?: string; end?: string };

type Recap = {
  hadirDikantor: number;
  luarRadius: number;
  dinasLuar: number;
  terlambat: number;
  alfa: number;
  izin: number;
  sakit: number;
  cuti: number;
};

function emptyRecap(): Recap {
  return {
    hadirDikantor: 0,
    luarRadius: 0,
    dinasLuar: 0,
    terlambat: 0,
    alfa: 0,
    izin: 0,
    sakit: 0,
    cuti: 0,
  };
}

export default async function RekapanKehadiranPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(Role.ADMIN);

  const today = getWorkDate();
  const range = resolveAttendanceRange(await searchParams, today);

  const [users, recapRows] = await Promise.all([
    UserService.list(),
    ReportService.buildRecap({
      startDate: range.startDate,
      endDate: range.endDate,
    }),
  ]);

  const recapByUser = new Map<string, Recap>();

  for (const row of recapRows) {
    const recap = recapByUser.get(row.user.id) ?? emptyRecap();

    if (row.status === "HADIR_DIKANTOR") recap.hadirDikantor += 1;
    if (row.status === "LUAR_RADIUS") recap.luarRadius += 1;
    if (row.status === "DINAS_LUAR") recap.dinasLuar += 1;

    // Terlambat adalah atribut absen masuk, bukan status — sudah ikut terhitung
    // di `hadirDikantor`.
    if (row.status === "HADIR_DIKANTOR" && row.checkIn?.isLate) {
      recap.terlambat += 1;
    }

    // Hari libur sudah berstatus LIBUR sejak `buildRecap`, jadi di sini tinggal
    // menyaring hari yang belum lewat — hari berjalan belum bisa disebut bolos.
    if (row.status === "ALFA" && row.workDate.getTime() < today.getTime()) {
      recap.alfa += 1;
    }

    // Hari yang benar-benar dipakai izin/sakit/cuti — kalau karyawan tetap
    // absen, statusnya sudah jadi kehadiran di atas.
    if (row.status === "IZIN") recap.izin += 1;
    if (row.status === "SAKIT") recap.sakit += 1;
    if (row.status === "CUTI") recap.cuti += 1;

    recapByUser.set(row.user.id, recap);
  }

  const rows: AttendanceSummaryRow[] = users.map((user) => {
    const recap = recapByUser.get(user.id) ?? emptyRecap();

    return {
      id: user.id,
      name: user.name,
      role: user.role,
      position: user.position ?? "",
      isActive: user.isActive,
      hasRecap: user.role === Role.EMPLOYEE,
      totalHadirDikantor: recap.hadirDikantor,
      totalLuarRadius: recap.luarRadius,
      totalDinasLuar: recap.dinasLuar,
      totalTerlambat: recap.terlambat,
      totalAlfa: recap.alfa,
      totalIzin: recap.izin,
      totalSakit: recap.sakit,
      totalCuti: recap.cuti,
    };
  });

  const rangeLabel = `${formatWorkDate(range.startDate)} — ${formatWorkDate(range.endDate)}`;

  const exportParams = new URLSearchParams({
    start: toDateInputValue(range.startDate),
    end: toDateInputValue(range.endDate),
  });

  // Cuma karyawan (hasRecap) yang punya angka kehadiran — admin tidak absen.
  const recapEligible = rows.filter((row) => row.hasRecap);
  const totalHadir = recapEligible.reduce(
    (sum, row) =>
      sum + row.totalHadirDikantor + row.totalLuarRadius + row.totalDinasLuar,
    0,
  );
  const totalAlfa = recapEligible.reduce((sum, row) => sum + row.totalAlfa, 0);

  const sumField = (field: keyof AttendanceSummaryRow) =>
    recapEligible.reduce((sum, row) => sum + (row[field] as number), 0);

  const statusChartData = [
    {
      key: "HADIR_DIKANTOR",
      label: "Hadir di Kantor",
      value: sumField("totalHadirDikantor"),
    },
    {
      key: "LUAR_RADIUS",
      label: "Luar Radius",
      value: sumField("totalLuarRadius"),
    },
    {
      key: "DINAS_LUAR",
      label: "Dinas Luar",
      value: sumField("totalDinasLuar"),
    },
    { key: "SAKIT", label: "Sakit", value: sumField("totalSakit") },
    { key: "IZIN", label: "Izin", value: sumField("totalIzin") },
    { key: "CUTI", label: "Cuti", value: sumField("totalCuti") },
    { key: "ALFA", label: "Alfa", value: totalAlfa },
  ];
  const statusChartTotal = statusChartData.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rekapan Kehadiran"
        subtitle={`Rekap kehadiran pekerja · ${rangeLabel}`}
        actions={
          <>
            <DateRangeNav
              start={toDateInputValue(range.startDate)}
              end={toDateInputValue(range.endDate)}
              today={toDateInputValue(today)}
              label={rangeLabel.replace("—", "–")}
              basePath="/admin/rekapan-kehadiran"
            />
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/api/rekapan-kehadiran?${exportParams.toString()}`}
                prefetch={false}
              >
                <Download className="size-4" />
                Download Excel
              </Link>
            </Button>
          </>
        }
      />

      {range.error && (
        <p className="text-destructive text-sm">
          {range.error} — menampilkan bulan ini.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Total Hadir"
          icon={CheckCircle2}
          value={String(totalHadir)}
          footerLabel={`Kantor, dinas luar · ${rangeLabel}`}
        />
        <StatTile
          label="Total Alfa"
          icon={UserX}
          value={String(totalAlfa)}
          footerLabel={`Sepanjang ${rangeLabel}`}
        />
      </div>

      <Panel
        title="Ringkasan Kehadiran"
        icon={TrendingUp}
        action={
          <span className="text-muted-foreground shrink-0 text-sm">
            {rangeLabel}
          </span>
        }
      >
        <AttendanceStatusChart total={statusChartTotal} data={statusChartData} />
      </Panel>

      <AttendanceSummaryTable rows={rows} />
    </div>
  );
}
