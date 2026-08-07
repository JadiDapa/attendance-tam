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

/** Warna latar kotak per status — penanda utamanya tetap teks jam/status. */
const CELL_TONE: Record<CalendarStatus, string> = {
  HADIR: "border-chart-hadir/40 bg-chart-hadir/10",
  TERLAMBAT: "border-chart-terlambat/40 bg-chart-terlambat/10",
  IZIN: "border-border bg-muted/60",
  ALPA: "border-destructive/40 bg-destructive/10",
  LIBUR: "border-transparent bg-muted/30",
  PERLU_VERIFIKASI: "border-chart-terlambat/40 bg-chart-terlambat/10",
  KOSONG: "border-border bg-card",
};

function DayCell({
  day,
  isFirstOfGrid,
  dimmed,
  onSelect,
}: {
  day: AttendanceDay;
  /** Kotak pertama tiap bulan digeser ke kolom hari yang benar. */
  isFirstOfGrid: boolean;
  dimmed: boolean;
  onSelect: (day: AttendanceDay) => void;
}) {
  const hasEntry = Boolean(day.checkIn || day.checkOut);

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      style={{
        gridColumnStart: isFirstOfGrid ? day.weekdayIndex + 1 : undefined,
      }}
      aria-label={`${day.dateLabel} — ${CALENDAR_STATUS_LABEL[day.status]}`}
      className={cn(
        "hover:border-primary/60 focus-visible:ring-ring flex min-h-18 flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
        CELL_TONE[day.status],
        day.isToday && "ring-primary ring-2",
        dimmed && "opacity-35",
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            day.status === "LIBUR" && "text-muted-foreground",
          )}
        >
          {day.dayOfMonth}
        </span>
        <span
          className={cn("size-1.5 rounded-full", CALENDAR_STATUS_DOT[day.status])}
        />
      </span>

      {hasEntry ? (
        <span className="flex flex-col gap-0.5 text-[11px] leading-tight tabular-nums">
          <span className="truncate">↓ {day.checkIn?.time ?? "--:--"}</span>
          <span className="text-muted-foreground truncate">
            ↑ {day.checkOut?.time ?? "--:--"}
          </span>
        </span>
      ) : (
        <span className="text-muted-foreground truncate text-[11px] leading-tight">
          {day.status === "IZIN"
            ? (day.statusDetail ?? "Izin")
            : day.status === "ALPA"
              ? "Tidak absen"
              : ""}
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

            <div className="text-muted-foreground grid grid-cols-7 gap-1 text-center text-xs font-medium">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {month.days.map((day, index) => (
                <DayCell
                  key={day.key}
                  day={day}
                  isFirstOfGrid={index === 0}
                  dimmed={
                    highlightStatus !== null && day.status !== highlightStatus
                  }
                  onSelect={setSelected}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {(["HADIR", "TERLAMBAT", "IZIN", "ALPA"] as const).map((status) => (
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
