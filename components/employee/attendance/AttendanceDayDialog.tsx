"use client";

import AttendanceEntryDetail from "@/components/dashboard/AttendanceEntryDetail";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CALENDAR_STATUS_LABEL,
  RECAP_STATUS_VARIANT,
  type AttendanceDay,
} from "@/lib/attendance";

/** Detail satu hari — dipakai kalender maupun tabel supaya isinya persis sama. */
export default function AttendanceDayDialog({
  day,
  onOpenChange,
}: {
  day: AttendanceDay | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={day !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {day && (
          <>
            <DialogHeader>
              <DialogTitle>{day.dateLabel}</DialogTitle>
              <DialogDescription>
                Rincian absensi yang terekam pada tanggal ini.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  day.status === "LIBUR" || day.status === "KOSONG"
                    ? "outline"
                    : RECAP_STATUS_VARIANT[day.status]
                }
              >
                {CALENDAR_STATUS_LABEL[day.status]}
              </Badge>
              {day.statusDetail && (
                <span className="text-muted-foreground text-sm">
                  {day.statusDetail}
                </span>
              )}
              {day.durationLabel && (
                <span className="text-muted-foreground text-sm">
                  Durasi kerja {day.durationLabel}
                </span>
              )}
            </div>

            {day.checkIn || day.checkOut ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {day.checkIn && <AttendanceEntryDetail entry={day.checkIn} />}
                {day.checkOut && <AttendanceEntryDetail entry={day.checkOut} />}
              </div>
            ) : (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Tidak ada absensi pada tanggal ini.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
