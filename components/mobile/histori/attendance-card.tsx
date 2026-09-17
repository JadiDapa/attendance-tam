import { MapPin } from "lucide-react";
import { DateBlock } from "@/components/mobile/date-block";
import { Icon } from "@/components/mobile/icon";
import { StatColumn } from "@/components/mobile/stat-column";
import { cn } from "@/lib/utils";

export type DayStatus = "Hadir" | "Izin" | "Sakit" | "Cuti";

export type DayRecord = {
  date: string; // ISO yyyy-MM-dd
  location: string;
  status: DayStatus;
  isLate: boolean;
  /** "1j 30m" / "45m" — how late the check-in was, when isLate is true. */
  lateBy: string | null;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: string;
};

// Background color of the date block — doubles as the status indicator, so no separate badge is needed.
const STATUS_DATE_BLOCK_CLASSES: Record<DayStatus, string> = {
  Hadir: "bg-primary",
  Izin: "bg-amber-600",
  Sakit: "bg-orange-600",
  Cuti: "bg-blue-600",
};

/** Mirrors mobile's `AttendanceCard` — used on Beranda's "Absen Terakhir" list and the Histori screen. */
export function AttendanceCard({ record }: { record: DayRecord }) {
  return (
    <div className="bg-card flex gap-3 rounded-2xl p-3">
      <DateBlock
        iso={record.date}
        colorClassName={STATUS_DATE_BLOCK_CLASSES[record.status]}
      />

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
        <div className="flex">
          <StatColumn
            label="Check In"
            value={record.checkIn ?? "--:--"}
            danger={record.isLate}
          />
          <StatColumn
            label="Check out"
            value={record.checkOut ?? "--:--"}
            divider
          />
          <StatColumn label="Total Hours" value={record.totalHours} divider />
        </div>

        <div className="flex items-center gap-1.5">
          <Icon
            icon={MapPin}
            size={16}
            tone={record.isLate ? "destructive" : "muted"}
          />
          <span
            className={cn(
              "line-clamp-1 flex-1 text-sm",
              record.isLate
                ? "font-semibold text-red-600 dark:text-red-400"
                : "text-muted-foreground",
            )}
          >
            {record.location}
            {record.isLate
              ? ` · Terlambat${record.lateBy ? ` ${record.lateBy}` : ""}`
              : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
