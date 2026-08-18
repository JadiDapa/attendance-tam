"use client";

import { useState } from "react";
import AttendanceDayDialog from "./AttendanceDayDialog";
import {
  CALENDAR_STATUS_DOT,
  CALENDAR_STATUS_LABEL,
  type AttendanceDay,
  type AttendanceMonth,
  type CalendarStatus,
} from "@/lib/attendance";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Warna latar kotak — cuma hari libur/kosong yang dibedakan, sisanya polos
 * supaya warna status terpusat di chip. */
const CELL_TONE: Partial<Record<CalendarStatus, string>> = {
  LIBUR: "bg-muted/30",
  KOSONG: "bg-card",
};

/** Warna chip jam/status di dalam kotak — meniru "event chip" kalender asli. */
const CHIP_TONE: Record<CalendarStatus, string> = {
  HADIR_DIKANTOR: "bg-chart-hadir/15 text-chart-hadir",
  WFH: "bg-chart-1/15 text-chart-1",
  DINAS_LUAR: "bg-chart-3/15 text-chart-3",
  SAKIT: "bg-chart-5/15 text-chart-5",
  IZIN: "bg-muted-foreground/15 text-muted-foreground",
  ALFA: "bg-destructive/15 text-destructive",
  CUTI: "bg-chart-4/15 text-chart-4",
  LIBUR: "bg-muted text-muted-foreground",
  KOSONG: "bg-muted text-muted-foreground",
};

/** Status yang isinya perlu dijelaskan walau tidak ada jam absensinya. */
const EMPTY_DAY_NOTE: Partial<Record<CalendarStatus, string>> = {
  SAKIT: "Sakit",
  IZIN: "Izin",
  CUTI: "Cuti",
  ALFA: "Alfa",
};

function LeadingGridCell({ index }: { index: number }) {
  return (
    <div
      key={`lead-${index}`}
      aria-hidden
      className="bg-muted/10 border-border border-r border-b"
    />
  );
}

function DayCell({
  day,
  dimmed,
  onSelect,
}: {
  day: AttendanceDay;
  dimmed: boolean;
  onSelect: (day: AttendanceDay) => void;
}) {
  const hasEntry = Boolean(day.checkIn || day.checkOut);
  const chipLabel = hasEntry
    ? `${day.checkIn?.time ?? "--:--"} – ${day.checkOut?.time ?? "--:--"}`
    : (day.statusDetail ?? EMPTY_DAY_NOTE[day.status]);

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-label={`${day.dateLabel} — ${CALENDAR_STATUS_LABEL[day.status]}`}
      className={cn(
        "border-border hover:bg-muted/40 focus-visible:ring-ring flex min-h-24 flex-col gap-1.5 border-r border-b p-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none",
        CELL_TONE[day.status] ?? "bg-card",
        dimmed && "opacity-35",
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            day.isToday
              ? "bg-primary text-primary-foreground"
              : day.status === "LIBUR"
                ? "text-muted-foreground"
                : "text-foreground",
          )}
        >
          {day.dayOfMonth}
        </span>
        <span
          className={cn("size-1.5 rounded-full", CALENDAR_STATUS_DOT[day.status])}
        />
      </span>

      {chipLabel && (
        <span
          className={cn(
            "truncate rounded-md px-1.5 py-1 text-[11px] leading-tight font-medium tabular-nums",
            CHIP_TONE[day.status],
          )}
        >
          {chipLabel}
        </span>
      )}
    </button>
  );
}

export default function AttendanceCalendar({
  months,
  /**
   * Kalau diisi, hari dengan status lain diredupkan — kotak tetap digambar
   * supaya kolom hari tidak bergeser.
   */
  highlightStatus = null,
}: {
  months: AttendanceMonth[];
  highlightStatus?: CalendarStatus | null;
}) {
  const [selected, setSelected] = useState<AttendanceDay | null>(null);

  return (
    <>
      <div className="flex flex-col gap-6">
        {months.map((month) => (
          <div key={month.key} className="flex flex-col gap-2">
            {months.length > 1 && (
              <p className="text-sm font-semibold">{month.label}</p>
            )}

            <div className="border-border overflow-hidden rounded-lg border-t border-l">
              <div className="grid grid-cols-7">
                {WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday}
                    className="border-border bg-muted/40 text-muted-foreground border-r border-b py-2 text-center text-xs font-medium"
                  >
                    {weekday}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {Array.from({ length: month.days[0]?.weekdayIndex ?? 0 }).map(
                  (_, index) => (
                    <LeadingGridCell key={`lead-${index}`} index={index} />
                  ),
                )}
                {month.days.map((day) => (
                  <DayCell
                    key={day.key}
                    day={day}
                    dimmed={
                      highlightStatus !== null && day.status !== highlightStatus
                    }
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {(
          [
            "HADIR_DIKANTOR",
            "WFH",
            "DINAS_LUAR",
            "SAKIT",
            "IZIN",
            "CUTI",
            "ALFA",
          ] as const
        ).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-full", CALENDAR_STATUS_DOT[status])}
            />
            {CALENDAR_STATUS_LABEL[status]}
          </span>
        ))}
      </div>

      <AttendanceDayDialog
        day={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
