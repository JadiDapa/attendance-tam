import Link from "next/link";
import {
  CalendarIcon as CalendarRange,
  CheckCircledIcon as CheckCircle2,
  ClipboardIcon as ClipboardList,
  ClockIcon as Clock4,
  ExitIcon as LogOut,
} from "@radix-ui/react-icons";
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
import MobileOverview from "@/components/employee/dashboard/MobileOverview";
import MobileHistory from "@/components/employee/dashboard/MobileHistory";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import {
  CALENDAR_STATUS_LABEL,
  DAY_STATUS_OPTIONS,
  toRecapEntry,
  type DayStatus,
} from "@/lib/attendance";
import {
  buildAttendanceDays,
  groupDaysByMonth,
  resolveAttendanceRange,
  summarizeDays,
} from "@/lib/attendance-days";
import {
  addDays,
  formatCompactDate,
  formatWeekday,
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
import { FaceService } from "@/servers/services/face.service";
import {
  formatDayHours,
  getWorkDayFor,
  summarizeWeek,
} from "@/lib/work-schedule";
import AttendancePunctuality from "@/components/dashboard/AttendancePunctuality";
import AttendanceStatusChart from "@/components/dashboard/AttendanceStatusChart";
import { cn } from "@/lib/utils";

type SearchParams = {
  start?: string;
  end?: string;
  view?: string;
  status?: string;
};

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
  const statusFilter = DAY_STATUS_OPTIONS.includes(params.status as DayStatus)
    ? (params.status as DayStatus)
    : null;

  // Rentang tetap 90 hari ke belakang, lepas dari filter tanggal desktop —
  // daftar riwayat mobile selalu menunjukkan absensi terbaru karyawan.
  const historyRange = { startDate: addDays(today, -89), endDate: today };

  const [
    todayStatus,
    schedule,
    workDays,
    office,
    rows,
    historyRows,
    faceEnrolled,
  ] = await Promise.all([
    AttendanceService.getTodayStatus(user.id, today),
    WorkScheduleService.getActive(),
    WorkDayService.list(),
    OfficeLocationService.getActive(),
    ReportService.buildRecap({
      startDate: range.startDate,
      endDate: range.endDate,
      userId: user.id,
    }),
    ReportService.buildRecap({
      startDate: historyRange.startDate,
      endDate: historyRange.endDate,
      userId: user.id,
    }),
    FaceService.isEnrolled(user.id),
  ]);

  const days = buildAttendanceDays({
    rows,
    startDate: range.startDate,
    endDate: range.endDate,
    today,
  });
  const historyDays = buildAttendanceDays({
    rows: historyRows,
    startDate: historyRange.startDate,
    endDate: historyRange.endDate,
    today,
  });
  const recentHistory = historyDays
    .filter((day) => day.checkIn || day.checkOut)
    .reverse()
    .slice(0, 12);
  const todaySchedule = getWorkDayFor(today, workDays);
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

    return `/dashboard?${query.toString()}`;
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

  const facePhoto =
    todayStatus.checkIn?.photoUrl ??
    todayStatus.checkOut?.photoUrl ??
    [...rows].reverse().find((row) => row.checkIn)?.checkIn?.photoUrl ??
    null;

  const mobileOffice = office
    ? {
        latitude: office.latitude,
        longitude: office.longitude,
        radiusMeters: office.radiusMeters,
      }
    : null;

  return (
    <div className="flex flex-col gap-5">
      <MobileOverview
        greeting={greeting(new Date())}
        name={user.name}
        photoUrl={facePhoto}
        weekdayLabel={formatWeekday(today)}
        shortDateLabel={formatCompactDate(today)}
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
        checkInScheduled={
          todaySchedule.isWorkingDay ? todaySchedule.checkInTime : null
        }
        checkOutScheduled={
          todaySchedule.isWorkingDay ? todaySchedule.checkOutTime : null
        }
        office={mobileOffice}
        maxAccuracyMeters={schedule?.maxAccuracyMeters ?? 100}
        faceEnrolled={faceEnrolled}
      />

      <MobileHistory days={recentHistory} />

      <div className="hidden lg:flex lg:flex-col lg:gap-5">
        <PageHeader
          title="Dashboard"
          subtitle={`${formatWorkDate(range.startDate)} — ${formatWorkDate(range.endDate)}`}
          actions={
            <DateRangeNav
              start={start}
              end={end}
              today={toDateInputValue(today)}
              label={`${formatCompactDate(range.startDate)} to ${formatCompactDate(range.endDate)}`}
              basePath="/dashboard"
              keepParams={{
                view,
                ...(statusFilter ? { status: statusFilter } : {}),
              }}
            />
          }
        />

        {range.error && (
          <p className="text-destructive text-sm">
            {range.error} — menampilkan bulan ini.
          </p>
        )}

        <div className="flex gap-5">
          <ProfileCard
            greeting={greeting(new Date())}
            name={user.name}
            position={user.position}
            email={user.email}
            phone={user.phone}
            photoUrl={facePhoto}
            scheduleLabel={
              todaySchedule.isWorkingDay
                ? `Hari ini ${formatDayHours(todaySchedule)}`
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
            office={mobileOffice}
            maxAccuracyMeters={schedule?.maxAccuracyMeters ?? 100}
            faceEnrolled={faceEnrolled}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <div className="flex w-full gap-4">
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

        <Panel
          title="Riwayat Absensi"
          icon={CalendarRange}
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
            <div className="flex w-full items-end">
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
              "bg-primary/10 relative z-0 flex flex-col gap-4 p-4",
              view !== "calendar" ? "rounded-b-lg" : "rounded-lg",
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
    </div>
  );
}
