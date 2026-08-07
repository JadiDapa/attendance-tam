import {
  CalendarRange,
  CalendarX2,
  CheckCircle2,
  ClipboardList,
  Percent,
  Timer,
} from "lucide-react";
import Panel from "@/components/dashboard/Panel";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import AttendanceCalendar from "@/components/employee/attendance/AttendanceCalendar";
import AttendanceDayTable from "@/components/employee/attendance/AttendanceDayTable";
import DateRangeNav from "@/components/dashboard/DateRangeNav";
import AttendanceViewToggle, {
  parseAttendanceView,
  type AttendanceView,
} from "@/components/employee/attendance/AttendanceViewToggle";
import ProfileCard from "@/components/employee/dashboard/ProfileCard";
import TodayAttendance from "@/components/employee/dashboard/TodayAttendance";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { toRecapEntry } from "@/lib/attendance";
import {
  buildAttendanceDays,
  formatPercent,
  groupDaysByMonth,
  resolveAttendanceRange,
  summarizeDays,
} from "@/lib/attendance-days";
import {
  formatWorkDate,
  getMinutesOfDay,
  getWorkDate,
  toDateInputValue,
} from "@/lib/date";
import { AttendanceService } from "@/servers/services/attendance.service";
import { ReportService } from "@/servers/services/report.service";
import {
  OfficeLocationService,
  WorkDayService,
  WorkScheduleService,
} from "@/servers/services/setting.service";
import { formatDayHours, getWorkDayFor } from "@/lib/work-schedule";

type SearchParams = { start?: string; end?: string; view?: string };

function greeting(now: Date) {
  const minutes = getMinutesOfDay(now);

  if (minutes < 11 * 60) return "Selamat pagi";
  if (minutes < 15 * 60) return "Selamat siang";
  if (minutes < 18 * 60) return "Selamat sore";

  return "Selamat malam";
}

export default async function EmployeeDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole(Role.EMPLOYEE);

  const params = await searchParams;
  const today = getWorkDate();
  const range = resolveAttendanceRange(params, today);
  const view = parseAttendanceView(params.view, "calendar");

  const [todayStatus, schedule, workDays, office, rows] = await Promise.all([
    AttendanceService.getTodayStatus(user.id, today),
    WorkScheduleService.getActive(),
    WorkDayService.list(),
    OfficeLocationService.getActive(),
    ReportService.buildRecap({
      startDate: range.startDate,
      endDate: range.endDate,
      userId: user.id,
    }),
  ]);

  const days = buildAttendanceDays({
    rows,
    startDate: range.startDate,
    endDate: range.endDate,
    today,
  });
  const todaySchedule = getWorkDayFor(today, workDays);
  const summary = summarizeDays(days);

  const start = toDateInputValue(range.startDate);
  const end = toDateInputValue(range.endDate);
  const buildViewHref = (next: AttendanceView) =>
    `/dashboard?start=${start}&end=${end}&view=${next}`;

  const facePhoto =
    todayStatus.checkIn?.photoUrl ??
    todayStatus.checkOut?.photoUrl ??
    [...rows].reverse().find((row) => row.checkIn)?.checkIn?.photoUrl ??
    null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Dashboard"
        subtitle={`${formatWorkDate(range.startDate)} — ${formatWorkDate(range.endDate)}`}
        actions={
          <DateRangeNav
            start={start}
            end={end}
            today={toDateInputValue(today)}
            label={`${formatWorkDate(range.startDate)} – ${formatWorkDate(range.endDate)}`}
            basePath="/dashboard"
            keepParams={{ view }}
          />
        }
      />

      {range.error && (
        <p className="text-destructive text-sm">
          {range.error} — menampilkan bulan ini.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <ProfileCard
          greeting={greeting(new Date())}
          name={user.name}
          position={user.position}
          email={user.email}
          phone={user.phone}
          photoUrl={facePhoto}
          scheduleLabel={
            todaySchedule.isWorkingDay
              ? `Hari ini ${formatDayHours(todaySchedule)} · toleransi telat ${schedule?.lateToleranceMinutes ?? 0} menit`
              : "Hari ini libur"
          }
          officeLabel={
            office ? `${office.name} · radius ${office.radiusMeters} m` : null
          }
        />

        <TodayAttendance
          dateLabel={formatWorkDate(today)}
          checkIn={
            todayStatus.checkIn
              ? toRecapEntry("Absen Masuk", todayStatus.checkIn)
              : null
          }
          checkOut={
            todayStatus.checkOut
              ? toRecapEntry("Absen Pulang", todayStatus.checkOut)
              : null
          }
          hasOffice={Boolean(office)}
          maxAccuracyMeters={schedule?.maxAccuracyMeters ?? 100}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Hadir"
          icon={CheckCircle2}
          value={String(summary.hadir)}
          footerLabel={`dari ${summary.expected} hari kerja`}
        />
        <StatTile
          label="Terlambat"
          icon={Timer}
          value={String(summary.terlambat)}
          footerLabel="Melewati toleransi"
          delta={
            summary.terlambat > 0
              ? {
                  text: formatPercent(summary.terlambat, summary.expected),
                  direction: "down",
                }
              : { text: "0%", direction: "flat" }
          }
        />
        <StatTile
          label="Izin / Cuti"
          icon={ClipboardList}
          value={String(summary.izin)}
          footerLabel="Disetujui admin"
        />
        <StatTile
          label="Tidak Absen"
          icon={CalendarX2}
          value={String(summary.alpa)}
          footerLabel="Hari kerja terlewat"
          delta={
            summary.alpa > 0
              ? {
                  text: formatPercent(summary.alpa, summary.expected),
                  direction: "down",
                }
              : { text: "0%", direction: "flat" }
          }
        />
        <StatTile
          label="Tingkat Kehadiran"
          icon={Percent}
          value={formatPercent(summary.hadir + summary.terlambat, summary.expected)}
          footerLabel={`${summary.hadir + summary.terlambat} dari ${summary.expected} hari kerja`}
        />
      </div>

      <Panel
        title="Riwayat Absensi"
        icon={CalendarRange}
        action={
          <AttendanceViewToggle active={view} buildHref={buildViewHref} />
        }
        contentClassName="p-4"
      >
        {days.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Tidak ada tanggal pada rentang ini.
          </p>
        ) : view === "calendar" ? (
          <AttendanceCalendar months={groupDaysByMonth(days)} />
        ) : (
          <AttendanceDayTable days={[...days].reverse()} />
        )}
      </Panel>
    </div>
  );
}
