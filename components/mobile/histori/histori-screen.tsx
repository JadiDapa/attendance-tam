"use client";

import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { FilterTabs } from "@/components/mobile/filter-tabs";
import { StatsRow } from "@/components/mobile/stats-row";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/mobile/date-range-picker";
import {
  AttendanceCard,
  type DayRecord,
  type DayStatus,
} from "@/components/mobile/histori/attendance-card";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { MobileTabBar } from "@/components/mobile/tab-bar";
import { formatShortDateWithYear, formatTime } from "@/lib/date";
import {
  useAttendanceHistoryQuery,
  useLeaveRequestsQuery,
} from "@/lib/mobile-queries";
import type { Role } from "@/generated/prisma";

const TABS: ("Semua" | DayStatus)[] = [
  "Semua",
  "Hadir",
  "Izin",
  "Sakit",
  "Cuti",
];

const WORK_MODE_LABEL: Record<string, string> = {
  HADIR_DIKANTOR: "Kantor Pusat",
  LUAR_RADIUS: "Luar Radius",
};

const LEAVE_TYPE_TO_STATUS: Record<string, DayStatus> = {
  IZIN: "Izin",
  SAKIT: "Sakit",
  CUTI: "Cuti",
};

function eachDateInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);

  while (cursor.getTime() <= endDate.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function formatDurationBetween(fromIso: string, toIso: string) {
  const minutes = Math.round(
    (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000,
  );
  if (minutes < 0) return "--:--";
  return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
}

function formatHHmm(iso: string) {
  return formatTime(new Date(iso));
}

export function HistoriScreen({
  role,
  pendingReviewCount = 0,
}: {
  role: Role;
  pendingReviewCount?: number;
}) {
  const [range, setRange] = useState<DateRange>(() => {
    const today = new Date();
    const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1))
      .toISOString()
      .slice(0, 10);
    return { start, end: today.toISOString().slice(0, 10) };
  });
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Semua");

  const attendance = useAttendanceHistoryQuery({
    from: range.start,
    to: range.end,
  });
  const leave = useLeaveRequestsQuery();

  const records = useMemo<DayRecord[]>(() => {
    if (!attendance.data) return [];

    const attendanceByDate = new Map(
      attendance.data.days.map((day) => [day.workDate.slice(0, 10), day]),
    );
    const approvedLeaves = (leave.data?.items ?? []).filter(
      (item) => item.status === "APPROVED",
    );

    return eachDateInRange(range.start, range.end).flatMap(
      (date): DayRecord[] => {
        const day = attendanceByDate.get(date);

        if (day?.checkIn) {
          return [
            {
              date,
              location:
                WORK_MODE_LABEL[day.checkIn.workMode] ?? day.checkIn.workMode,
              status: "Hadir",
              isLate: day.checkIn.isLate,
              lateBy:
                day.checkIn.lateMinutes > 0
                  ? `${day.checkIn.lateMinutes}m`
                  : null,
              checkIn: formatHHmm(day.checkIn.timestamp),
              checkOut: day.checkOut
                ? formatHHmm(day.checkOut.timestamp)
                : null,
              totalHours:
                day.checkIn && day.checkOut
                  ? formatDurationBetween(
                      day.checkIn.timestamp,
                      day.checkOut.timestamp,
                    )
                  : "--:--",
            },
          ];
        }

        const leaveOnDay = approvedLeaves.find(
          (item) =>
            item.startDate.slice(0, 10) <= date &&
            item.endDate.slice(0, 10) >= date,
        );

        if (leaveOnDay) {
          return [
            {
              date,
              location: "-",
              status: LEAVE_TYPE_TO_STATUS[leaveOnDay.type],
              isLate: false,
              lateBy: null,
              checkIn: null,
              checkOut: null,
              totalHours: "--:--",
            },
          ];
        }

        return [];
      },
    );
  }, [attendance.data, leave.data, range]);

  const visibleRecords = (
    activeTab === "Semua"
      ? records
      : records.filter((r) => r.status === activeTab)
  )
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const daysInRange = eachDateInRange(range.start, range.end).length;
  const hadirCount = records.filter((r) => r.status === "Hadir").length;
  const telatCount = records.filter(
    (r) => r.status === "Hadir" && r.isLate,
  ).length;
  const tidakHadirCount = Math.max(daysInRange - records.length, 0);

  const stats = [
    { label: "Hadir", value: hadirCount },
    { label: "Telat", value: telatCount },
    { label: "Tidak Hadir", value: tidakHadirCount },
  ];

  const isLoading = attendance.isPending || leave.isPending;

  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader
        title="Histori"
        showBack
        pendingReviewCount={pendingReviewCount}
      />

      <div className="flex flex-col gap-4 px-5 pt-4 pb-24">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="bg-muted flex flex-1 items-center gap-2 rounded-xl px-4 py-3"
          >
            <Icon icon={Calendar} size={18} tone="muted" />
            <span className="text-foreground text-sm">
              {formatShortDateWithYear(range.start)} -{" "}
              {formatShortDateWithYear(range.end)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="bg-primary text-primary-foreground rounded-xl px-4 text-sm font-medium"
          >
            Filter
          </button>
        </div>

        <FilterTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        <StatsRow items={stats} />

        <p className="text-muted-foreground text-sm">
          Menampilkan daftar dari {formatShortDateWithYear(range.start)} s/d{" "}
          {formatShortDateWithYear(range.end)}
        </p>

        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="border-muted-foreground/30 border-t-primary size-6 animate-spin rounded-full border-2" />
            </div>
          ) : visibleRecords.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Tidak ada data absensi untuk filter ini.
            </p>
          ) : (
            visibleRecords.map((record) => (
              <AttendanceCard key={record.date} record={record} />
            ))
          )}
        </div>
      </div>

      <DateRangePicker
        open={isPickerOpen}
        value={range}
        onClose={() => setPickerOpen(false)}
        onApply={(next) => {
          setRange(next);
          setPickerOpen(false);
        }}
      />

      <MobileTabBar role={role} pendingReviewCount={pendingReviewCount} />
    </div>
  );
}
