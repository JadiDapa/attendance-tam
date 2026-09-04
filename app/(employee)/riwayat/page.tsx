import Link from "next/link";
import {
  CalendarIcon as CalendarRange,
  CheckCircledIcon as CheckCircle2,
  ClipboardIcon as ClipboardList,
  ClockIcon as Clock4,
  ExitIcon as LogOut,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import StatTile from "@/components/dashboard/StatTile";
import AttendanceCalendar from "@/components/employee/attendance/AttendanceCalendar";
import AttendanceDayTable from "@/components/employee/attendance/AttendanceDayTable";
import MobileAttendanceFilters from "@/components/employee/attendance/MobileAttendanceFilters";
import DateRangeNav from "@/components/dashboard/DateRangeNav";
import AttendanceViewToggle, {
  parseAttendanceView,
  type AttendanceView,
} from "@/components/employee/attendance/AttendanceViewToggle";
import { Role } from "@/generated/prisma";
import {
  CALENDAR_STATUS_LABEL,
  DAY_STATUS_OPTIONS,
  type DayStatus,
} from "@/lib/attendance";
import {
  buildAttendanceDays,
  groupDaysByMonth,
  resolveAttendanceRange,
  summarizeDays,
} from "@/lib/attendance-days";
import {
  formatCompactDate,
  formatWorkDate,
  getWorkDate,
  toDateInputValue,
} from "@/lib/date";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ReportService } from "@/servers/services/report.service";
import {
  WorkDayService,
  WorkScheduleService,
} from "@/servers/services/setting.service";
import { summarizeWeek } from "@/lib/work-schedule";
import AttendanceStatusChart from "@/components/dashboard/AttendanceStatusChart";
import AttendancePunctuality from "@/components/dashboard/AttendancePunctuality";

type SearchParams = {
  start?: string;
  end?: string;
  view?: string;
  status?: string;
};

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
  const statusFilter = DAY_STATUS_OPTIONS.includes(params.status as DayStatus)
    ? (params.status as DayStatus)
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
    status?: DayStatus | null;
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

  const visibleDays = statusFilter
    ? days.filter((day) => day.status === statusFilter)
    : days;

  const statusCount: Record<DayStatus, number> = {
    HADIR_DIKANTOR: summary.hadirDikantor,
    WFH: summary.wfh,
    DINAS_LUAR: summary.dinasLuar,
    SAKIT: summary.sakit,
    IZIN: summary.izin,
    ALFA: summary.alfa,
    CUTI: summary.cuti,
    LIBUR: summary.libur,
  };

  // Tampilan Kolom cuma menampilkan hari yang ada ceritanya. KOSONG (hari
  // yang belum terjadi) tidak pernah punya tab filternya sendiri, jadi selalu
  // disingkirkan. LIBUR cuma disingkirkan saat tab "Semua" aktif — begitu
  // tab Libur dipilih, statusFilter sudah menyaring ke LIBUR saja sehingga
  // baris itu justru yang perlu tampil.
  const tableDays = statusFilter
    ? visibleDays
    : visibleDays.filter(
        (day) => day.status !== "KOSONG" && day.status !== "LIBUR",
      );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Riwayat Absensi"
        subtitle={`${formatWorkDate(range.startDate)} — ${formatWorkDate(range.endDate)}`}
        back
        actions={
          <div className="hidden lg:block">
            <DateRangeNav
              start={start}
              end={end}
              today={toDateInputValue(today)}
              label={`${formatCompactDate(range.startDate)} to ${formatCompactDate(range.endDate)}`}
              basePath="/riwayat"
              keepParams={{
                view,
                ...(statusFilter ? { status: statusFilter } : {}),
              }}
            />
          </div>
        }
      />

      <MobileAttendanceFilters
        start={start}
        view={view}
        statusFilter={statusFilter}
        basePath="/riwayat"
      />

      <p className="text-muted-foreground text-sm lg:hidden">
        {visibleDays.length} hari ditemukan
      </p>

      {range.error && (
        <p className="text-destructive text-sm">
          {range.error} — menampilkan bulan ini.
        </p>
      )}

      <div className="hidden gap-4 sm:grid-cols-2 lg:grid xl:grid-cols-4">
        <StatTile
          label="Total Hadir"
          icon={CheckCircle2}
          value={String(summary.totalHadir)}
          footerLabel={`${summary.hadirDikantor} kantor · ${summary.wfh} WFH · ${summary.dinasLuar} dinas luar`}
        />
        <StatTile
          label="Menunggu Approval"
          icon={ClipboardList}
          value={String(summary.pendingApproval)}
          footerLabel="Absensi luar kantor belum disetujui"
        />
        <StatTile
          label="Absen Pulang"
          icon={LogOut}
          value={`${summary.totalHadir - summary.missingCheckOut}/${summary.totalHadir}`}
          footerLabel={
            summary.missingCheckOut > 0
              ? `${summary.missingCheckOut} hari belum absen pulang`
              : "Semua absensi lengkap"
          }
        />
        <StatTile
          label="Rata-rata Jam Masuk"
          icon={Clock4}
          value={summary.averageCheckIn ?? "--:--"}
          footerLabel={`${week.scheduleLabel} · toleransi ${schedule?.lateToleranceMinutes ?? 0} menit`}
        />
      </div>

      <div className="hidden w-full gap-4 lg:flex">
        <Panel
          title="Rekapan Kehadiran"
          icon={CheckCircle2}
          className="flex-2 p-4"
        >
          <AttendanceStatusChart
            total={
              summary.totalHadir +
              summary.sakit +
              summary.izin +
              summary.cuti +
              summary.alfa
            }
            data={[
              {
                key: "HADIR_DIKANTOR",
                label: "Hadir di Kantor",
                value: summary.hadirDikantor,
              },
              { key: "WFH", label: "WFH", value: summary.wfh },
              {
                key: "DINAS_LUAR",
                label: "Dinas Luar",
                value: summary.dinasLuar,
              },
              { key: "SAKIT", label: "Sakit", value: summary.sakit },
              { key: "IZIN", label: "Izin", value: summary.izin },
              { key: "CUTI", label: "Cuti", value: summary.cuti },
              { key: "ALFA", label: "Alfa", value: summary.alfa },
            ]}
          />
        </Panel>

        <Panel title="Ketepatan Waktu" icon={Clock4} className="flex flex-1">
          {/* Hanya kehadiran di kantor yang dinilai tepat waktu/terlambat. */}
          <AttendancePunctuality
            onTime={summary.hadirDikantor - summary.terlambat}
            late={summary.terlambat}
          />
        </Panel>
      </div>

      {/* Mobile/tablet: daftar langsung, tanpa bungkus panel/kotak. */}
      <div className="flex flex-col gap-3 lg:hidden">
        {visibleDays.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Tidak ada tanggal untuk filter ini.
          </p>
        ) : tableDays.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Tidak ada absensi untuk ditampilkan.
          </p>
        ) : (
          <AttendanceDayTable days={[...tableDays].reverse()} />
        )}
      </div>

      <Panel
        title="Rincian per Tanggal"
        icon={CalendarRange}
        className="hidden lg:flex"
        action={
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground shrink-0 text-sm">
              {visibleDays.length} hari
            </span>
            <AttendanceViewToggle
              active={view}
              buildHref={(next) => buildHref({ view: next })}
            />
          </div>
        }
        contentClassName="flex flex-col p-4"
      >
        {view !== "calendar" && (
          <div className="hidden w-full items-end lg:flex">
            <Link
              href={buildHref({ status: null })}
              aria-current={statusFilter === null ? "true" : undefined}
              className={cn(
                "flex flex-1 basis-0 items-center justify-center px-2 py-2 text-center text-sm font-medium whitespace-nowrap transition-all",
                "[clip-path:polygon(0_14%,6%_0,82%_0,92%_14%,100%_100%,0_100%)]",
                statusFilter === null
                  ? "bg-primary/10 text-foreground relative z-10 shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted translate-y-0.5",
              )}
            >
              Semua ({days.length})
            </Link>

            {DAY_STATUS_OPTIONS.map((status) => (
              <Link
                key={status}
                href={buildHref({ status })}
                aria-current={statusFilter === status ? "true" : undefined}
                className={cn(
                  "flex flex-1 basis-0 items-center justify-center px-2 py-2 text-center text-sm font-medium whitespace-nowrap transition-all",
                  "[clip-path:polygon(0_14%,6%_0,82%_0,92%_14%,100%_100%,0_100%)]",
                  statusFilter === status
                    ? "bg-primary/10 text-foreground relative z-10 shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted translate-y-0.5",
                )}
              >
                {CALENDAR_STATUS_LABEL[status]} ({statusCount[status]})
              </Link>
            ))}
          </div>
        )}

        <div
          className={cn(
            "bg-primary/10 relative z-0 flex flex-col gap-4 rounded-lg p-4",
            view !== "calendar" && "lg:rounded-t-none lg:rounded-b-lg",
          )}
        >
          {visibleDays.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Tidak ada tanggal untuk filter ini.
            </p>
          ) : view === "calendar" ? (
            <AttendanceCalendar
              months={groupDaysByMonth(days)}
              highlightStatus={statusFilter}
            />
          ) : tableDays.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Tidak ada absensi untuk ditampilkan.
            </p>
          ) : (
            <AttendanceDayTable days={[...tableDays].reverse()} />
          )}
        </div>
      </Panel>
    </div>
  );
}
