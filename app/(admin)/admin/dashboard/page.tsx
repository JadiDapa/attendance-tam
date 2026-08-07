import Link from "next/link";
import {
  BellDot,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Percent,
  TrendingUp,
  Users,
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import AttendanceRecapTable from "@/components/admin/AttendanceRecapTable";
import AttendanceTrendChart, {
  type TrendPoint,
} from "@/components/admin/dashboard/AttendanceTrendChart";
import DashboardDateNav from "@/components/admin/dashboard/DashboardDateNav";
import Panel from "@/components/dashboard/Panel";
import StatTile from "@/components/dashboard/StatTile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorrectionStatus, LeaveStatus, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import {
  RECAP_STATUS_DOT,
  RECAP_STATUS_LABEL,
  RECAP_STATUS_OPTIONS,
  type RecapStatus,
} from "@/lib/attendance";
import { buildDailyRecap, countRecapStatus } from "@/lib/daily-recap";
import {
  addDays,
  formatShortDate,
  formatWeekday,
  formatWorkDate,
  fromDateInputValue,
  getMinutesOfDay,
  getWorkDate,
  toDateInputValue,
} from "@/lib/date";
import { LEAVE_TYPE_LABEL, countLeaveDays } from "@/lib/leave";
import { cn } from "@/lib/utils";
import { isNonWorkingDate } from "@/lib/work-schedule";
import { UserService } from "@/servers/services/user.service";
import { AttendanceService } from "@/servers/services/attendance.service";
import { LeaveService } from "@/servers/services/leave.service";
import { ReportService } from "@/servers/services/report.service";
import { CorrectionService } from "@/servers/services/correction.service";
import { HolidayService } from "@/servers/services/holiday.service";
import { WorkDayService } from "@/servers/services/setting.service";

type SearchParams = { date?: string; status?: string };

/** Jumlah hari yang ditampilkan di grafik tren. */
const TREND_DAYS = 14;

function greeting(now: Date) {
  const minutes = getMinutesOfDay(now);

  if (minutes < 11 * 60) return "Selamat pagi";
  if (minutes < 15 * 60) return "Selamat siang";
  if (minutes < 18 * 60) return "Selamat sore";

  return "Selamat malam";
}

function percent(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await requireRole(Role.ADMIN);

  const params = await searchParams;
  const workDate =
    (params.date && fromDateInputValue(params.date)) || getWorkDate();
  const statusFilter = RECAP_STATUS_OPTIONS.includes(
    params.status as RecapStatus,
  )
    ? (params.status as RecapStatus)
    : null;

  const trendStart = addDays(workDate, -(TREND_DAYS - 1));
  const weekStart = addDays(
    workDate,
    workDate.getUTCDay() === 0 ? -6 : 1 - workDate.getUTCDay(),
  );

  const [
    employees,
    attendances,
    approvedLeaves,
    pendingLeaves,
    trendRows,
    upcomingLeaves,
    pendingCorrections,
    holiday,
    workDays,
  ] = await Promise.all([
    UserService.list({ role: Role.EMPLOYEE, isActive: true }),
    AttendanceService.listByDate(workDate),
    LeaveService.listApprovedOnDate(workDate),
    LeaveService.list({ status: LeaveStatus.PENDING }),
    ReportService.buildRecap({ startDate: trendStart, endDate: workDate }),
    LeaveService.listApprovedInRange({
      startDate: weekStart,
      endDate: addDays(weekStart, 6),
    }),
    CorrectionService.list({ status: CorrectionStatus.PENDING }),
    HolidayService.getByDate(workDate),
    WorkDayService.list(),
  ]);

  const activeIds = new Set(employees.map((employee) => employee.id));
  const employeeById = new Map(
    employees.map((employee) => [employee.id, employee]),
  );

  const today = getWorkDate();
  const isDayOff = holiday !== null || isNonWorkingDate(workDate, workDays);

  const rows = buildDailyRecap({
    employees,
    attendances,
    approvedLeaves,
    workDate,
    today,
    isDayOff,
    holidayName: holiday?.name ?? null,
  });
  const counts = countRecapStatus(rows);

  const total = rows.length;
  const presentToday = counts.HADIR + counts.TERLAMBAT;
  // Hari libur tidak menuntut kehadiran, jadi tidak ikut jadi penyebut.
  const expectedToday = total - counts.LIBUR;
  const presenceRate = percent(presentToday, expectedToday);

  // Tren dibatasi ke karyawan aktif juga, supaya angkanya sejalan dengan kartu
  // di atas. Hari libur dilewati — kalau ikut dihitung, grafiknya turun tajam
  // tiap akhir pekan dan tanggal merah tanpa ada yang benar-benar bolos.
  const trendByDate = new Map<
    number,
    { hadir: number; terlambat: number; total: number }
  >();

  for (const row of trendRows) {
    if (!activeIds.has(row.user.id) || row.status === "LIBUR") continue;

    const key = row.workDate.getTime();
    const bucket = trendByDate.get(key) ?? { hadir: 0, terlambat: 0, total: 0 };

    bucket.total += 1;
    if (row.status === "HADIR") bucket.hadir += 1;
    if (row.status === "TERLAMBAT") bucket.terlambat += 1;

    trendByDate.set(key, bucket);
  }

  const trendDates = [...trendByDate.keys()].sort((a, b) => a - b);
  const trend: TrendPoint[] = trendDates.map((key) => {
    const bucket = trendByDate.get(key)!;

    return {
      label: formatShortDate(new Date(key)),
      hadir: bucket.hadir,
      terlambat: bucket.terlambat,
    };
  });

  // Pembanding kartu tingkat kehadiran: rata-rata hari sebelumnya dalam rentang tren.
  const previousDays = trendDates
    .filter((key) => key !== workDate.getTime())
    .map((key) => {
      const bucket = trendByDate.get(key)!;

      return percent(bucket.hadir + bucket.terlambat, bucket.total);
    });
  const previousAverage = previousDays.length
    ? previousDays.reduce((sum, value) => sum + value, 0) / previousDays.length
    : null;
  const presenceDelta =
    previousAverage === null ? null : presenceRate - previousAverage;

  const weekAgo = addDays(today, -7);
  const newEmployees = employees.filter(
    (employee) => employee.createdAt.getTime() >= weekAgo.getTime(),
  ).length;
  const newLeaveRequests = pendingLeaves.filter(
    (leave) => leave.createdAt.getTime() >= weekAgo.getTime(),
  ).length;

  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  // Antrean tindakan admin: izin + koreksi absensi.
  const pendingReviews = pendingLeaves.length + pendingCorrections.length;

  const visibleRows = statusFilter
    ? rows.filter((row) => row.status === statusFilter)
    : rows;

  const dateValue = toDateInputValue(workDate);
  const buildHref = (status: RecapStatus | null, date = dateValue) => {
    const query = new URLSearchParams({ date });
    if (status) query.set("status", status);

    return `/admin/dashboard?${query.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`${greeting(new Date())}, ${admin.name}`}
        subtitle="Ringkasan kehadiran karyawan dan pengajuan yang menunggu tindakan."
        actions={
          <>
            <DashboardDateNav
              date={dateValue}
              label={formatWorkDate(workDate)}
              basePath="/admin/dashboard"
              status={statusFilter}
            />
            <Button
              asChild
              variant="outline"
              size="icon"
              className="relative rounded-full"
            >
              <Link href="/admin/izin" aria-label="Pengajuan menunggu review">
                <BellDot className="size-4" />
                {pendingReviews > 0 && (
                  <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full" />
                )}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Kolom utama */}
        <div className="flex min-w-0 flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="Total Karyawan"
              icon={Users}
              value={String(total)}
              footerLabel="7 hari terakhir"
              delta={
                newEmployees > 0
                  ? { text: `+${newEmployees}`, direction: "up" }
                  : { text: "tetap", direction: "flat" }
              }
            />
            <StatTile
              label="Menunggu Review"
              icon={ClipboardList}
              value={String(pendingReviews)}
              footerLabel={`${pendingLeaves.length} izin · ${pendingCorrections.length} koreksi`}
              delta={
                newLeaveRequests > 0
                  ? { text: `+${newLeaveRequests}`, direction: "down" }
                  : { text: "tetap", direction: "flat" }
              }
            />
            <StatTile
              label="Tingkat Kehadiran"
              icon={Percent}
              value={formatPercent(presenceRate)}
              footerLabel={`Rata-rata ${TREND_DAYS} hari`}
              delta={
                presenceDelta === null
                  ? null
                  : {
                      text: `${presenceDelta >= 0 ? "+" : ""}${presenceDelta.toFixed(1)}%`,
                      direction: presenceDelta >= 0 ? "up" : "down",
                    }
              }
            />
          </div>

          <Panel
            title="Ringkasan Kehadiran"
            icon={TrendingUp}
            action={
              <Link
                href="/admin/laporan"
                className="text-primary shrink-0 text-sm font-medium hover:underline"
              >
                Lihat laporan
              </Link>
            }
            contentClassName="p-5 pt-4"
          >
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div className="flex flex-wrap items-end gap-8">
                <div>
                  <p className="text-3xl font-bold tracking-tight tabular-nums">
                    {formatPercent(presenceRate)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Tingkat kehadiran
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight tabular-nums">
                    {presentToday}
                    <span className="text-muted-foreground text-xl font-medium">
                      /{total}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Absen hari ini
                  </p>
                </div>
              </div>

              {/* Tiap status menyaring tabel rekap di bawah. */}
              <div className="flex flex-wrap gap-6">
                {RECAP_STATUS_OPTIONS.map((status) => (
                  <Link
                    key={status}
                    href={buildHref(status)}
                    className="group"
                  >
                    <span
                      className={cn(
                        "mb-1.5 block h-1 w-7 rounded-full",
                        RECAP_STATUS_DOT[status],
                      )}
                    />
                    <p className="text-sm font-semibold tabular-nums">
                      {formatPercent(percent(counts[status], total))}
                    </p>
                    <p className="text-muted-foreground group-hover:text-foreground text-xs transition-colors">
                      {RECAP_STATUS_LABEL[status]}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Legenda: identitas seri tidak boleh hanya lewat warna. */}
            <div className="text-muted-foreground mb-2 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="bg-chart-hadir size-2 rounded-full" />
                Hadir
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-chart-terlambat size-2 rounded-full" />
                Terlambat
              </span>
              <span className="ml-auto">{TREND_DAYS} hari terakhir</span>
            </div>

            {trend.length > 0 ? (
              <AttendanceTrendChart data={trend} />
            ) : (
              <p className="text-muted-foreground py-10 text-center text-sm">
                Belum ada data absensi pada rentang ini.
              </p>
            )}
          </Panel>
        </div>

        {/* Kolom kanan */}
        <aside className="flex flex-col gap-5">
          <Panel
            title="Perlu Tindakan"
            icon={ClipboardCheck}
            action={
              <Link
                href="/admin/izin"
                className="text-primary shrink-0 text-sm font-medium hover:underline"
              >
                Semua
              </Link>
            }
            contentClassName="flex flex-col gap-3 p-4"
          >
            {pendingCorrections.length > 0 && (
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href="/admin/koreksi">
                  Tinjau {pendingCorrections.length} koreksi absensi
                </Link>
              </Button>
            )}

            {pendingLeaves.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Tidak ada pengajuan izin yang menunggu review.
              </p>
            ) : (
              <>
                {pendingLeaves.slice(0, 3).map((leave) => (
                  <div
                    key={leave.id}
                    className="border-border rounded-xl border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {leave.user.name}
                      </p>
                      <Badge variant="outline" className="shrink-0">
                        {LEAVE_TYPE_LABEL[leave.type]}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatShortDate(leave.startDate)} –{" "}
                      {formatShortDate(leave.endDate)} ·{" "}
                      {countLeaveDays(leave.startDate, leave.endDate)} hari
                    </p>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {leave.reason}
                    </p>
                  </div>
                ))}

                <Button asChild size="sm" className="w-full">
                  <Link href="/admin/izin">
                    Tinjau {pendingLeaves.length} pengajuan
                  </Link>
                </Button>
              </>
            )}
          </Panel>

          <Panel
            title="Kalender Kerja"
            icon={CalendarRange}
            contentClassName="flex flex-col gap-4 p-4"
          >
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const isSelected = day.getTime() === workDate.getTime();
                const isToday = day.getTime() === today.getTime();

                return (
                  <Link
                    key={day.getTime()}
                    href={buildHref(statusFilter, toDateInputValue(day))}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg py-1.5 text-xs transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span className="tabular-nums">{day.getUTCDate()}</span>
                    <span
                      className={cn(
                        isToday && !isSelected && "text-primary font-semibold",
                      )}
                    >
                      {formatWeekday(day)}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="border-border flex flex-col gap-2 border-t pt-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Izin disetujui minggu ini
              </p>

              {upcomingLeaves.length === 0 ? (
                <p className="text-muted-foreground py-2 text-sm">
                  Tidak ada izin terjadwal.
                </p>
              ) : (
                upcomingLeaves.slice(0, 4).map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">
                      {employeeById.get(leave.userId)?.name ?? "Karyawan"}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatShortDate(leave.startDate)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </aside>

        {/* Tabel rekap — melebar penuh di bawah kedua kolom */}
        <div className="min-w-0 xl:col-span-2">
          <Panel
            title="Rekap Kehadiran"
            icon={ClipboardList}
            action={
              <Link
                href={`/admin/kehadiran?date=${dateValue}`}
                className="text-primary shrink-0 text-sm font-medium hover:underline"
              >
                Buka halaman kehadiran
              </Link>
            }
            contentClassName="flex flex-col gap-4 p-4"
          >
            <div className="bg-muted flex w-fit max-w-full flex-wrap gap-1 rounded-full p-1">
              <Link
                href={buildHref(null)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  statusFilter === null
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Semua ({total})
              </Link>

              {RECAP_STATUS_OPTIONS.map((status) => (
                <Link
                  key={status}
                  href={buildHref(status)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    statusFilter === status
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {RECAP_STATUS_LABEL[status]} ({counts[status]})
                </Link>
              ))}
            </div>

            <AttendanceRecapTable rows={visibleRows} bare />
          </Panel>
        </div>
      </div>
    </div>
  );
}
