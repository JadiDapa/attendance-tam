"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CALENDAR_STATUS_LABEL,
  DAY_STATUS_OPTIONS,
  type DayStatus,
} from "@/lib/attendance";

const ALL = "ALL";

function toValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** "YYYY-MM" (dari input type=month) → rentang satu bulan penuh. */
function monthRangeFromInput(value: string) {
  const [year, month] = value.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return { start: toValue(start), end: toValue(end) };
}

type Props = {
  /** "YYYY-MM-DD" — awal rentang aktif, dipakai untuk isi input bulan. */
  start: string;
  view: string;
  statusFilter: DayStatus | null;
  basePath: string;
};

/** Filter ringkas khusus mobile/tablet: dropdown bulan + dropdown status. */
export default function MobileAttendanceFilters({
  start,
  view,
  statusFilter,
  basePath,
}: Props) {
  const router = useRouter();

  const navigate = (next: {
    range?: { start: string; end: string };
    status?: DayStatus | null;
  }) => {
    const range = next.range ?? monthRangeFromInput(start.slice(0, 7));
    const status = next.status === undefined ? statusFilter : next.status;

    const params = new URLSearchParams({
      start: range.start,
      end: range.end,
      view,
    });

    if (status) params.set("status", status);

    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-2 gap-2 lg:hidden">
      <input
        type="month"
        value={start.slice(0, 7)}
        onChange={(event) => {
          if (!event.target.value) return;
          navigate({ range: monthRangeFromInput(event.target.value) });
        }}
        className="border-input bg-card text-foreground h-10 rounded-lg border px-3 text-sm"
      />

      <Select
        value={statusFilter ?? ALL}
        onValueChange={(value) =>
          navigate({ status: value === ALL ? null : (value as DayStatus) })
        }
      >
        <SelectTrigger className="h-10 w-full">
          <SelectValue placeholder="Semua status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua status</SelectItem>
          {DAY_STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {CALENDAR_STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
