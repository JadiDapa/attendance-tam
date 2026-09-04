import Link from "next/link";
import {
  ArrowRightIcon as ArrowRight,
  BellIcon as BellDot,
  CalendarIcon as CalendarRange,
  CheckCircledIcon as CheckCircle2,
  ClipboardIcon as ClipboardCheck,
  ClipboardIcon as ClipboardList,
  ClockIcon as Clock4,
  ArrowTopRightIcon as TrendingUp,
  AvatarIcon as Users,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import AttendanceRecapTable from "@/components/admin/AttendanceRecapTable";
import AttendanceStatusChart from "@/components/dashboard/AttendanceStatusChart";
import AttendancePunctuality from "@/components/dashboard/AttendancePunctuality";
import DashboardDateNav from "@/components/admin/dashboard/DashboardDateNav";
import Panel from "@/components/dashboard/Panel";
import StatTile from "@/components/dashboard/StatTile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeaveStatus, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import {
  DAY_STATUS_LABEL,
  DAY_STATUS_OPTIONS,
  type DayStatus,
} from "@/lib/attendance";
import {
  buildDailyRecap,
  countPresent,
  countRecapStatus,
} from "@/lib/daily-recap";
import {
  addDays,
  formatShortDate,
  formatWeekday,
  formatWorkDate,
  fromDateInputValue,
  getWorkDate,
  toDateInputValue,
} from "@/lib/date";
import { LEAVE_TYPE_LABEL, countLeaveDays } from "@/lib/leave";
import { cn } from "@/lib/utils";
import { isNonWorkingDate } from "@/lib/work-schedule";
import { UserService } from "@/servers/services/user.service";
import { AttendanceService } from "@/servers/services/attendance.service";
import { LeaveService } from "@/servers/services/leave.service";
import { HolidayService } from "@/servers/services/holiday.service";
import { WorkDayService } from "@/servers/services/setting.service";

type SearchParams = { date?: string; status?: string };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await requireRole(Role.ADMIN);

  const params = await searchParams;
  const workDate =
    (params.date && fromDateInputValue(params.date)) || getWorkDate();
  const statusFilter = DAY_STATUS_OPTIONS.includes(params.status as DayStatus)
    ? (params.status as DayStatus)
    : null;

  const weekStart = addDays(
    workDate,
    workDate.getUTCDay() === 0 ? -6 : 1 - workDate.getUTCDay(),
  );

  const [
    employees,
    attendances,
    approvedLeaves,
    pendingLeaves,
    upcomingLeaves,
    pendingAttendanceApprovals,
    holiday,
    workDays,
  ] = await Promise.all([
    UserService.list({ role: Role.EMPLOYEE, isActive: true }),
    AttendanceService.listByDate(workDate),
    LeaveService.listApprovedOnDate(workDate),
    LeaveService.list({ status: LeaveStatus.PENDING }),
    LeaveService.listApprovedInRange({
      startDate: weekStart,
      endDate: addDays(weekStart, 6),
    }),
    AttendanceService.countPendingApproval(),
    HolidayService.getByDate(workDate),
    WorkDayService.list(),
  ]);

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
  const presentToday = countPresent(counts);

  // Sama seperti summary.terlambat di dashboard karyawan: atribut dari
  // HADIR_DIKANTOR, bukan status tersendiri.
  const lateToday = rows.filter(
    (row) => row.status === "HADIR_DIKANTOR" && row.checkIn?.isLate,
  ).length;

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

  // Antrean tindakan admin: pengajuan izin + approval absensi luar kantor.
  const pendingReviews = pendingLeaves.length + pendingAttendanceApprovals;

  const visibleRows = statusFilter
    ? rows.filter((row) => row.status === statusFilter)
    : rows;

  const dateValue = toDateInputValue(workDate);
  const buildHref = (status: DayStatus | null, date = dateValue) => {
    const query = new URLSearchParams({ date });
    if (status) query.set("status", status);

    return `/admin/dashboard?${query.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Welcome, ${admin.name}`}
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
          <div className="grid gap-4 md:grid-cols-3">
            <StatTile
              label="Total Karyawan"
              icon={Users}
              value={String(total)}
              footerLabel="7 hari terakhir"
              highlighted
              delta={
                newEmployees > 0
                  ? {
                      text: `+${newEmployees}`,
                      direction: "up",
                    }
                  : {
                      text: "tetap",
                      direction: "flat",
                    }
              }
            />

            <StatTile
              label="Menunggu Review"
              icon={ClipboardList}
              value={String(pendingReviews)}
              footerLabel={`${pendingLeaves.length} izin · ${pendingAttendanceApprovals} approval absensi`}
              delta={
                newLeaveRequests > 0
                  ? {
                      text: `+${newLeaveRequests}`,
                      direction: "down",
                    }
                  : {
                      text: "tetap",
                      direction: "flat",
                    }
              }
            />

            <StatTile
              label="Hadir Hari Ini"
              icon={CheckCircle2}
              value={`${presentToday}/${total}`}
              footerLabel={`${counts.HADIR_DIKANTOR} kantor · ${counts.WFH} WFH · ${counts.DINAS_LUAR} dinas luar`}
            />
          </div>

          <div className="flex min-w-0 flex-1 gap-4">
            <Panel
              title="Ringkasan Kehadiran"
              icon={TrendingUp}
              action={
                <div className="text-primary flex items-center gap-2">
                  <Link
                    href="/admin/laporan"
                    className="shrink-0 text-sm font-medium hover:underline"
                  >
                    Lihat laporan
                  </Link>
                  <ArrowRight className="size-4" />
                </div>
              }
              className="min-w-0 flex-2"
              contentClassName="flex flex-1 flex-col p-4 min-h-0"
            >
              <AttendanceStatusChart
                total={
                  presentToday +
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

            <Panel
              title="Ketepatan Waktu"
              icon={Clock4}
              className="flex min-w-0 flex-1"
              contentClassName="flex flex-1 flex-col p-4 min-h-0"
            >
              {/* Hanya kehadiran di kantor yang dinilai tepat waktu/terlambat. */}
              <AttendancePunctuality
                onTime={counts.HADIR_DIKANTOR - lateToday}
                late={lateToday}
              />
            </Panel>
          </div>
        </div>

        {/* Kolom kanan */}
        <aside className="flex flex-col gap-5">
          <Panel
            title="Perlu Tindakan"
            icon={ClipboardCheck}
            className="min-h-80"
            action={
              <div className="text-primary flex items-center gap-2">
                <Link
                  href="/admin/izin"
                  className="shrink-0 text-sm font-medium hover:underline"
                >
                  Semua
                </Link>
                <ArrowRight className="size-4" />
              </div>
            }
            contentClassName="flex flex-col gap-3 p-4"
          >
            {pendingAttendanceApprovals > 0 && (
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href="/admin/verifikasi">
                  Tinjau {pendingAttendanceApprovals} absensi luar kantor
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
            contentClassName="flex flex-col gap-4 p-4 h-68"
            action={
              <div className="text-primary flex items-center gap-2">
                <Link
                  href="/admin/izin"
                  className="shrink-0 text-sm font-medium hover:underline"
                >
                  Semua
                </Link>
                <ArrowRight className="size-4" />
              </div>
            }
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
                        isToday && !isSelected && "text-primary-subtle font-semibold",
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

              {DAY_STATUS_OPTIONS.map((status) => (
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
                  {DAY_STATUS_LABEL[status]} ({counts[status]})
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
