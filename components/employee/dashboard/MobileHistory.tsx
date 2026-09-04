import Link from "next/link";
import { ChevronRightIcon as ChevronRight } from "@radix-ui/react-icons";
import AttendanceDayCard from "@/components/employee/attendance/AttendanceDayCard";
import type { AttendanceDay } from "@/lib/attendance";

type Props = {
  days: AttendanceDay[];
};

/** Daftar riwayat absensi ringkas khusus mobile — pengganti tabel/kalender desktop. */
export default function MobileHistory({ days }: Props) {
  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Riwayat Absensi</h2>

        <Link
          href="/riwayat"
          className="text-primary flex items-center gap-0.5 text-sm font-medium"
        >
          Detail
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {days.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          Belum ada riwayat absensi.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {days.map((day) => (
            <AttendanceDayCard key={day.key} day={day} />
          ))}
        </div>
      )}
    </div>
  );
}
