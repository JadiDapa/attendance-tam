import Link from "next/link";
import { Download } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { RECAP_STATUS_LABEL, RECAP_STATUS_OPTIONS } from "@/lib/attendance";
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
    RECAP_STATUS_OPTIONS.map((status) => [
      status,
      rows.filter((row) => row.status === status).length,
    ]),
  ) as Record<ReportStatus, number>;
  const missingCheckOut = rows.filter((row) => row.missingCheckOut).length;

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

      <form className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="start">Dari tanggal</Label>
          <Input
            id="start"
            type="date"
            name="start"
            defaultValue={toDateInputValue(query.startDate)}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="end">Sampai tanggal</Label>
          <Input
            id="end"
            type="date"
            name="end"
            defaultValue={toDateInputValue(query.endDate)}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="userId">Karyawan</Label>
          <NativeSelect
            id="userId"
            name="userId"
            defaultValue={query.userId ?? ""}
            className="w-52"
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
          <NativeSelect
            id="mode"
            name="mode"
            defaultValue={query.mode}
            className="w-52"
          >
            <option value="all">Semua hari</option>
            <option value="activity">Hanya hari ada aktivitas</option>
          </NativeSelect>
        </div>
        <Button type="submit">Terapkan</Button>
      </form>

      {!resolved.ok && (
        <p className="text-destructive text-sm">{resolved.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {RECAP_STATUS_OPTIONS.map((status) => (
          <Card key={status}>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">
                {RECAP_STATUS_LABEL[status]}
              </p>
              <p className="text-2xl font-bold">{counts[status]}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Tidak absen pulang</p>
            <p className="text-2xl font-bold">{missingCheckOut}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {rows.length} baris siap diexport
          {rows.length > PREVIEW_LIMIT &&
            ` · pratinjau ${PREVIEW_LIMIT} baris pertama`}
        </p>
        <Button asChild disabled={!rows.length}>
          <Link href={`/api/laporan?${csvParams.toString()}`} prefetch={false}>
            <Download className="size-4" />
            Download CSV
          </Link>
        </Button>
      </div>

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
                    {RECAP_STATUS_LABEL[row.status]}
                    {row.leaveType && ` (${LEAVE_TYPE_LABEL[row.leaveType]})`}
                    {row.holidayName && ` (${row.holidayName})`}
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
                      ? "Koreksi manual"
                      : row.checkIn?.isWithinRadius === true
                        ? "Dalam radius"
                        : row.checkIn?.isWithinRadius === false
                          ? "Di luar radius"
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
    </div>
  );
}
