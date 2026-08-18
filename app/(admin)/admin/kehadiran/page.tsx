import Link from "next/link";
import {
  Briefcase,
  CalendarOff,
  ClipboardList,
  Download,
  FileText,
  House,
  Palmtree,
  Stethoscope,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import AttendanceRecapTable from "@/components/admin/AttendanceRecapTable";
import ManualAttendanceDialog from "@/components/admin/ManualAttendanceDialog";
import DashboardDateNav from "@/components/admin/dashboard/DashboardDateNav";
import Panel from "@/components/dashboard/Panel";
import StatTile from "@/components/dashboard/StatTile";
import { Button } from "@/components/ui/button";
import { Role } from "@/generated/prisma";
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
  formatWorkDate,
  fromDateInputValue,
  getWorkDate,
  toDateInputValue,
} from "@/lib/date";
import { cn } from "@/lib/utils";
import { isNonWorkingDate } from "@/lib/work-schedule";
import { AttendanceService } from "@/servers/services/attendance.service";
import { LeaveService } from "@/servers/services/leave.service";
import { UserService } from "@/servers/services/user.service";
import { HolidayService } from "@/servers/services/holiday.service";
import { WorkDayService } from "@/servers/services/setting.service";

type SearchParams = { date?: string; status?: string };

const STATUS_ICON: Record<DayStatus, LucideIcon> = {
  HADIR_DIKANTOR: UserCheck,
  WFH: House,
  DINAS_LUAR: Briefcase,
  SAKIT: Stethoscope,
  IZIN: FileText,
  ALFA: UserX,
  CUTI: Palmtree,
  LIBUR: CalendarOff,
};

export default async function KehadiranPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(Role.ADMIN);

  const params = await searchParams;
  const workDate =
    (params.date && fromDateInputValue(params.date)) || getWorkDate();
  const statusFilter = DAY_STATUS_OPTIONS.includes(params.status as DayStatus)
    ? (params.status as DayStatus)
    : null;

  const [employees, attendances, approvedLeaves, holiday, workDays] =
    await Promise.all([
      UserService.list({ role: Role.EMPLOYEE, isActive: true }),
      AttendanceService.listByDate(workDate),
      LeaveService.listApprovedOnDate(workDate),
      HolidayService.getByDate(workDate),
      WorkDayService.list(),
    ]);

  const isDayOff = holiday !== null || isNonWorkingDate(workDate, workDays);

  const rows = buildDailyRecap({
    employees,
    attendances,
    approvedLeaves,
    workDate,
    today: getWorkDate(),
    isDayOff,
    holidayName: holiday?.name ?? null,
  });
  const counts = countRecapStatus(rows);

  const total = rows.length;
  const presentToday = countPresent(counts);
  const pendingApproval = rows.filter((row) => row.pendingApproval).length;

  const visibleRows = statusFilter
    ? rows.filter((row) => row.status === statusFilter)
    : rows;

  const dateValue = toDateInputValue(workDate);
  const buildHref = (status: DayStatus | null) => {
    const query = new URLSearchParams({ date: dateValue });
    if (status) query.set("status", status);

    return `/admin/kehadiran?${query.toString()}`;
  };

  // Laporan harian: rentang satu hari yang sedang dilihat.
  const csvParams = new URLSearchParams({
    start: dateValue,
    end: dateValue,
    mode: "all",
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Rekap Kehadiran"
        subtitle={
          holiday
            ? `${formatWorkDate(workDate)} · ${holiday.name} — hari libur, absensi tidak diwajibkan`
            : `${presentToday} dari ${total} karyawan aktif sudah absen · ${formatWorkDate(workDate)}`
        }
        actions={
          <>
            <DashboardDateNav
              date={dateValue}
              label={formatWorkDate(workDate)}
              basePath="/admin/kehadiran"
              status={statusFilter}
            />
            <ManualAttendanceDialog
              employees={employees.map((employee) => ({
                id: employee.id,
                name: employee.name,
              }))}
              defaultDate={dateValue}
            />
            <Button asChild variant="outline">
              <Link
                href={`/api/laporan?${csvParams.toString()}`}
                prefetch={false}
              >
                <Download className="size-4" />
                Download CSV
              </Link>
            </Button>
          </>
        }
      />

      {pendingApproval > 0 && (
        <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
          <span>
            {pendingApproval} absensi luar kantor menunggu persetujuanmu.
          </span>
          <Link
            href="/admin/verifikasi"
            className="text-primary font-medium hover:underline"
          >
            Buka Approval Absensi
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {DAY_STATUS_OPTIONS.map((status) => (
          <StatTile
            key={status}
            label={DAY_STATUS_LABEL[status]}
            icon={STATUS_ICON[status]}
            value={String(counts[status])}
          />
        ))}
      </div>

      <Panel
        title="Rekap Kehadiran"
        icon={ClipboardList}
        action={
          <span className="text-muted-foreground shrink-0 text-sm">
            {formatWorkDate(workDate)}
          </span>
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
  );
}
