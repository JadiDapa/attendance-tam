import Link from "next/link";
import {
  CalendarRange,
  CalendarX2,
  CheckCircle2,
  ClipboardList,
  Clock4,
  LogOut,
  MapPinOff,
  Percent,
  Timer,
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import StatTile from "@/components/dashboard/StatTile";
import AttendanceCalendar from "@/components/employee/attendance/AttendanceCalendar";
import AttendanceDayTable from "@/components/employee/attendance/AttendanceDayTable";
import DateRangeNav from "@/components/dashboard/DateRangeNav";
import AttendanceViewToggle, {
  parseAttendanceView,
  type AttendanceView,
} from "@/components/employee/attendance/AttendanceViewToggle";
import { Role } from "@/generated/prisma";
import {
  CALENDAR_STATUS_LABEL,
  RECAP_STATUS_DOT,
  RECAP_STATUS_OPTIONS,
  type RecapStatus,
} from "@/lib/attendance";
import {
  buildAttendanceDays,
  formatPercent,
  groupDaysByMonth,
  resolveAttendanceRange,
  summarizeDays,
} from "@/lib/attendance-days";
import { formatWorkDate, getWorkDate, toDateInputValue } from "@/lib/date";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ReportService } from "@/servers/services/report.service";
import {
  WorkDayService,
  WorkScheduleService,
} from "@/servers/services/setting.service";
import { summarizeWeek } from "@/lib/work-schedule";

type SearchParams = { start?: string; end?: string; view?: string; status?: string };

export default async function RiwayatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole(Role.EMPLOYEE);

  const params = await searchParams;
  const today = getWorkDate();
  const range = resolveAttendanceRange(params, today);
  const view = parseAttendanceView(params.view, "table");
  const statusFilter = RECAP_STATUS_OPTIONS.includes(params.status as RecapStatus)
    ? (params.status as RecapStatus)
    : null;

  const [rows, schedule, workDays] = await Promise.all([
    ReportService.buildRecap({
      startDate: range.startDate,
      endDate: range.endDate,
      userId: user.id,
    }),
    WorkScheduleService.getActive(),
    WorkDayService.list(),
  ]);

  const days = buildAttendanceDays({
    rows,
    startDate: range.startDate,
    endDate: range.endDate,
    today,
  });
  const week = summarizeWeek(workDays);
  const summary = summarizeDays(days);

  const start = toDateInputValue(range.startDate);
  const end = toDateInputValue(range.endDate);

  const buildHref = (next: {
    view?: AttendanceView;
    status?: RecapStatus | null;
  }) => {
    const query = new URLSearchParams({
      start,
      end,
      view: next.view ?? view,
    });
    const status = next.status === undefined ? statusFilter : next.status;

    if (status) query.set("status", status);

    return `/riwayat?${query.toString()}`;
  };

  // Filter status hanya menyaring daftar hari yang tampil; kartu statistik tetap
  // menghitung seluruh rentang supaya tidak menyesatkan. Di kalender semua
  // tanggal tetap digambar (yang tidak cocok diredupkan) supaya kolom hari tidak
  // bergeser.
  const visibleDays = statusFilter
    ? days.filter((day) => day.status === statusFilter)
    : days;

  const statusCount: Record<RecapStatus, number> = {
    HADIR: summary.hadir,
    TERLAMBAT: summary.terlambat,
    IZIN: summary.izin,
    ALPA: summary.alpa,
    LIBUR: summary.libur,
    PERLU_VERIFIKASI: summary.perluVerifikasi,
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Riwayat Absensi"
        subtitle={`${formatWorkDate(range.startDate)} — ${formatWorkDate(range.endDate)}`}
        actions={
          <>
            <DateRangeNav
              start={start}
              end={end}
              today={toDateInputValue(today)}
              label={`${formatWorkDate(range.startDate)} – ${formatWorkDate(range.endDate)}`}
              basePath="/riwayat"
              keepParams={{
                view,
                ...(statusFilter ? { status: statusFilter } : {}),
              }}
            />
            <AttendanceViewToggle
              active={view}
              buildHref={(next) => buildHref({ view: next })}
            />
          </>
        }
      />

      {range.error && (
        <p className="text-destructive text-sm">
          {range.error} — menampilkan bulan ini.
        </p>
      )}

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
          value={formatPercent(
            summary.hadir + summary.terlambat,
            summary.expected,
          )}
          footerLabel={`${summary.hadir + summary.terlambat} dari ${summary.expected} hari kerja`}
        />
      </div>

      {/* Tiga angka yang cuma relevan di halaman riwayat. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Rata-rata Jam Masuk"
          icon={Clock4}
          value={summary.averageCheckIn ?? "--:--"}
          footerLabel={`${week.scheduleLabel} · toleransi ${schedule?.lateToleranceMinutes ?? 0} menit`}
        />
        <StatTile
          label="Absen di Luar Radius"
          icon={MapPinOff}
          value={String(summary.outsideRadius)}
          footerLabel="Hari dengan absensi di luar area kantor"
        />
        <StatTile
          label="Tidak Absen Pulang"
          icon={LogOut}
          value={String(summary.missingCheckOut)}
          footerLabel={
            summary.missingCheckOut > 0
              ? "Ajukan koreksi supaya jam kerja lengkap"
              : "Semua absensi lengkap"
          }
        />
      </div>

      <Panel
        title="Rincian per Tanggal"
        icon={CalendarRange}
        action={
          <span className="text-muted-foreground shrink-0 text-sm">
            {visibleDays.length} hari
          </span>
        }
        contentClassName="flex flex-col gap-4 p-4"
      >
        <div className="bg-muted flex w-fit max-w-full flex-wrap gap-1 rounded-full p-1">
          <Link
            href={buildHref({ status: null })}
            aria-current={statusFilter === null ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              statusFilter === null
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Semua ({days.length})
          </Link>

          {RECAP_STATUS_OPTIONS.map((status) => (
            <Link
              key={status}
              href={buildHref({ status })}
              aria-current={statusFilter === status ? "true" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === status
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn("size-2 rounded-full", RECAP_STATUS_DOT[status])}
              />
              {CALENDAR_STATUS_LABEL[status]} ({statusCount[status]})
            </Link>
          ))}
        </div>

        {visibleDays.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Tidak ada tanggal untuk filter ini.
          </p>
        ) : view === "calendar" ? (
          <AttendanceCalendar
            months={groupDaysByMonth(days)}
            highlightStatus={statusFilter}
          />
        ) : (
          <AttendanceDayTable days={[...visibleDays].reverse()} />
        )}
      </Panel>
    </div>
  );
}
