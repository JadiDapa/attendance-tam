import {
  InfoCircledIcon as Info,
  SewingPinIcon as MapPin,
} from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import {
  CALENDAR_STATUS_LABEL,
  DAY_STATUS_VARIANT,
  type AttendanceDay,
  type CalendarStatus,
} from "@/lib/attendance";
import { WORK_MODE_LABEL } from "@/lib/work-mode";
import { cn } from "@/lib/utils";

const WEEKDAY_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Catatan default kalau harinya tidak punya `statusDetail` sendiri. */
const STATUS_FALLBACK_NOTE: Record<CalendarStatus, string> = {
  HADIR_DIKANTOR: "Hadir di kantor",
  WFH: "Bekerja dari rumah",
  DINAS_LUAR: "Tugas di luar kantor",
  SAKIT: "Pengajuan sakit disetujui",
  IZIN: "Pengajuan izin disetujui",
  CUTI: "Pengajuan cuti disetujui",
  ALFA: "Tidak ada absensi tercatat",
  LIBUR: "Hari tidak bekerja",
  KOSONG: "Belum ada data",
};

function locationLabel(day: AttendanceDay) {
  const entries = [day.checkIn, day.checkOut].filter((entry) => entry !== null);

  if (!entries.length) return null;

  const outside = entries.find((entry) => entry.isWithinRadius === false);

  if (outside) {
    return `${WORK_MODE_LABEL[outside.effectiveMode]}${
      outside.distanceLabel ? ` · ${outside.distanceLabel} dari kantor` : ""
    }`;
  }

  if (entries.some((entry) => entry.isWithinRadius === true)) {
    return "Kantor · dalam radius";
  }

  return "Dicatat manual · tanpa lokasi";
}

/** Kartu absensi mobile: badge tanggal + ringkasan jam + lokasi, meniru "Your Attendance". */
export default function AttendanceDayCard({ day }: { day: AttendanceDay }) {
  const hasEntry = Boolean(day.checkIn || day.checkOut);
  const location = locationLabel(day);

  return (
    <div className="bg-card flex items-stretch gap-3 rounded-xl border p-3">
      <div
        className={cn(
          "flex w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl",
          day.isToday
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        <span className="text-2xl leading-none font-bold tabular-nums">
          {day.dayOfMonth}
        </span>
        <span
          className={cn(
            "text-xs font-medium",
            day.isToday
              ? "text-primary-foreground/80"
              : "text-muted-foreground",
          )}
        >
          {WEEKDAY_SHORT[day.weekdayIndex]}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
        {hasEntry ? (
          <>
            <div className="divide-border/70 grid grid-cols-3 divide-x">
              <div className="min-w-0 pr-2">
                <p className="truncate text-sm font-semibold tabular-nums">
                  {day.checkIn?.time ?? "-"}
                </p>
                <p className="text-muted-foreground text-[11px]">Check In</p>
              </div>
              <div className="min-w-0 px-2">
                <p className="truncate text-sm font-semibold tabular-nums">
                  {day.checkOut?.time ?? "-"}
                </p>
                <p className="text-muted-foreground text-[11px]">Check out</p>
              </div>
              <div className="min-w-0 pl-2">
                <p className="truncate text-sm font-semibold tabular-nums">
                  {day.durationLabel ?? "-"}
                </p>
                <p className="text-muted-foreground text-[11px]">Total Hours</p>
              </div>
            </div>

            {location && (
              <p className="text-muted-foreground border-border/70 flex items-center gap-1 border-t pt-2 text-xs">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center py-0.5">
              <Badge
                variant={
                  day.status === "KOSONG"
                    ? "outline"
                    : DAY_STATUS_VARIANT[day.status]
                }
              >
                {CALENDAR_STATUS_LABEL[day.status]}
              </Badge>
            </div>

            <p className="text-muted-foreground border-border/70 flex items-center gap-1 border-t pt-2 text-xs">
              <Info className="size-3 shrink-0" />
              <span className="truncate">
                {day.statusDetail ?? STATUS_FALLBACK_NOTE[day.status]}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
