import Link from "next/link";
import {
  CheckCircledIcon as CheckCircle2,
  ClipboardIcon as ClipboardList,
  ClockIcon as Clock4,
  DownloadIcon as Download,
  ExitIcon as LogOut,
  QuestionMarkCircledIcon as ShieldQuestion,
  MixerHorizontalIcon as SlidersHorizontal,
  ArrowTopRightIcon as TrendingUp,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import StatTile from "@/components/dashboard/StatTile";
import AttendanceStatusChart from "@/components/dashboard/AttendanceStatusChart";
import AttendancePunctuality from "@/components/dashboard/AttendancePunctuality";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import {
  formatTime,
  formatWorkDate,
  getWorkDate,
  toDateInputValue,
} from "@/lib/date";
import { LEAVE_TYPE_LABEL } from "@/lib/leave";
import { DAY_STATUS_LABEL, DAY_STATUS_OPTIONS } from "@/lib/attendance";
import { WORK_MODE_LABEL } from "@/lib/work-mode";
import { resolveReportQuery } from "@/servers/validators/report.validator";
import {
  ReportService,
  type ReportStatus,
} from "@/servers/services/report.service";
import { UserService } from "@/servers/services/user.service";

type SearchParams = {
  start?: string;
  end?: string;
  userId?: string;
  mode?: string;
};

const PREVIEW_LIMIT = 20;

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(Role.ADMIN);

  const params = await searchParams;
  const today = getWorkDate();
  const firstOfMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );

  const resolved = resolveReportQuery({
    start: params.start || toDateInputValue(firstOfMonth),
    end: params.end || toDateInputValue(today),
    userId: params.userId,
    mode: params.mode === "activity" ? "activity" : "all",
  });

  const employees = await UserService.list({ role: Role.EMPLOYEE });

  const query = resolved.ok
    ? resolved.value
    : { startDate: firstOfMonth, endDate: today, mode: "all" as const };

  const rows = await ReportService.buildRecap(query);

  const counts = Object.fromEntries(
    DAY_STATUS_OPTIONS.map((status) => [
      status,
      rows.filter((row) => row.status === status).length,
    ]),
  ) as Record<ReportStatus, number>;
  const missingCheckOut = rows.filter((row) => row.missingCheckOut).length;
  const pendingApproval = rows.filter((row) => row.pendingApproval).length;

  const totalHadir = counts.HADIR_DIKANTOR + counts.WFH + counts.DINAS_LUAR;

  // Sama seperti summary.terlambat di dashboard karyawan: atribut dari
  // HADIR_DIKANTOR, bukan status tersendiri.
  const lateCount = rows.filter(
    (row) => row.status === "HADIR_DIKANTOR" && row.checkIn?.isLate,
  ).length;

  const csvParams = new URLSearchParams({
    start: toDateInputValue(query.startDate),
    end: toDateInputValue(query.endDate),
    mode: query.mode,
  });

  if (query.userId) csvParams.set("userId", query.userId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Laporan Absensi"
        subtitle={`${formatWorkDate(query.startDate)} — ${formatWorkDate(query.endDate)}`}
      />

      <Panel
        title="Filter Laporan"
        icon={SlidersHorizontal}
        contentClassName="p-4 sm:p-5"
      >
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start">Dari tanggal</Label>
            <Input
              id="start"
              type="date"
              name="start"
              defaultValue={toDateInputValue(query.startDate)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="end">Sampai tanggal</Label>
            <Input
              id="end"
              type="date"
              name="end"
              defaultValue={toDateInputValue(query.endDate)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="userId">Karyawan</Label>
            <NativeSelect
              id="userId"
              name="userId"
              defaultValue={query.userId ?? ""}
            >
              <option value="">Semua karyawan</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mode">Isi laporan</Label>
            <NativeSelect id="mode" name="mode" defaultValue={query.mode}>
              <option value="all">Semua hari</option>
              <option value="activity">Hanya hari ada aktivitas</option>
            </NativeSelect>
          </div>
          <Button type="submit" className="w-full lg:w-auto">
            Terapkan
          </Button>
        </form>

        {!resolved.ok && (
          <p className="text-destructive mt-3 text-sm">{resolved.error}</p>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total Hadir"
          icon={CheckCircle2}
          value={String(totalHadir)}
          footerLabel={`${counts.HADIR_DIKANTOR} kantor · ${counts.WFH} WFH · ${counts.DINAS_LUAR} dinas luar`}
        />
        <StatTile
          label="Terlambat"
          icon={Clock4}
          value={String(lateCount)}
          footerLabel="Dari total hadir di kantor"
        />
        <StatTile
          label="Tidak Absen Pulang"
          icon={LogOut}
          value={String(missingCheckOut)}
          footerLabel="Absen masuk tanpa absen pulang"
        />
        <StatTile
          label="Menunggu Approval"
          icon={ShieldQuestion}
          value={String(pendingApproval)}
          footerLabel="Absensi luar kantor belum disetujui"
        />
      </div>

      <div className="flex gap-4">
        <Panel
          title="Ringkasan Status"
          icon={TrendingUp}
          className="flex-2 p-4"
        >
          <AttendanceStatusChart
            total={
              totalHadir +
              counts.SAKIT +
              counts.IZIN +
              counts.CUTI +
              counts.ALFA
            }
            data={[
              {
                key: "HADIR_DIKANTOR",
                label: "Hadir di Kantor",
                value: counts.HADIR_DIKANTOR,
              },
              { key: "WFH", label: "WFH", value: counts.WFH },
              {
                key: "DINAS_LUAR",
                label: "Dinas Luar",
                value: counts.DINAS_LUAR,
              },
              { key: "SAKIT", label: "Sakit", value: counts.SAKIT },
              { key: "IZIN", label: "Izin", value: counts.IZIN },
              { key: "CUTI", label: "Cuti", value: counts.CUTI },
              { key: "ALFA", label: "Alfa", value: counts.ALFA },
            ]}
          />
        </Panel>

        <Panel title="Ketepatan Waktu" icon={Clock4} className="flex flex-1">
          {/* Hanya kehadiran di kantor yang dinilai tepat waktu/terlambat. */}
          <AttendancePunctuality
            onTime={counts.HADIR_DIKANTOR - lateCount}
            late={lateCount}
          />
        </Panel>
      </div>

      <Panel
        title="Rekap Laporan"
        icon={ClipboardList}
        action={
          <Button asChild disabled={!rows.length} size="sm">
            <Link
              href={`/api/laporan?${csvParams.toString()}`}
              prefetch={false}
            >
              <Download className="size-4" />
              Download CSV
            </Link>
          </Button>
        }
        contentClassName="flex flex-col gap-3 p-4"
      >
        <p className="text-muted-foreground text-sm">
          {rows.length} baris siap diexport
          {rows.length > PREVIEW_LIMIT &&
            ` · pratinjau ${PREVIEW_LIMIT} baris pertama`}
        </p>

        <div className="bg-card overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Masuk</TableHead>
                <TableHead>Pulang</TableHead>
                <TableHead>Lokasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.slice(0, PREVIEW_LIMIT).map((row) => (
                  <TableRow key={`${row.workDate.getTime()}-${row.user.id}`}>
                    <TableCell>{formatWorkDate(row.workDate)}</TableCell>
                    <TableCell>{row.user.name}</TableCell>
                    <TableCell>
                      {DAY_STATUS_LABEL[row.status]}
                      {row.leaveType && ` (${LEAVE_TYPE_LABEL[row.leaveType]})`}
                      {row.holidayName && ` (${row.holidayName})`}
                      {row.pendingApproval && (
                        <span className="text-muted-foreground">
                          {" "}
                          · menunggu approval
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.checkIn ? formatTime(row.checkIn.timestamp) : "—"}
                    </TableCell>
                    <TableCell>
                      {row.checkOut ? (
                        formatTime(row.checkOut.timestamp)
                      ) : row.missingCheckOut ? (
                        <span className="text-destructive">Tidak absen</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {row.checkIn?.isManual
                        ? "Dicatat manual"
                        : row.checkIn?.isWithinRadius === true
                          ? "Dalam radius"
                          : row.checkIn?.isWithinRadius === false
                            ? `Di luar radius · ${WORK_MODE_LABEL[row.checkIn.approvedMode ?? row.checkIn.workMode]}`
                            : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Tidak ada data untuk filter ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}
