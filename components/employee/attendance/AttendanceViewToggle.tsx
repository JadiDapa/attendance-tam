import Link from "next/link";
import {
  CalendarIcon as CalendarDays,
  RowsIcon as Rows3,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

export type AttendanceView = "calendar" | "table";

export const ATTENDANCE_VIEWS: AttendanceView[] = ["calendar", "table"];

/** Bentuk `view` di URL — dipakai halaman untuk membaca query. */
export function parseAttendanceView(
  value: string | undefined,
  fallback: AttendanceView,
): AttendanceView {
  return ATTENDANCE_VIEWS.includes(value as AttendanceView)
    ? (value as AttendanceView)
    : fallback;
}

const OPTIONS = [
  { view: "calendar" as const, label: "Kalender", icon: CalendarDays },
  { view: "table" as const, label: "Kolom", icon: Rows3 },
];

/**
 * Pemilih tampilan riwayat. Pilihan disimpan di URL (`?view=`) supaya ikut
 * kebawa saat refresh, tombol back, atau link dibagikan.
 */
export default function AttendanceViewToggle({
  active,
  buildHref,
}: {
  active: AttendanceView;
  buildHref: (view: AttendanceView) => string;
}) {
  return (
    <div
      role="group"
      aria-label="Tampilan riwayat"
      className="border-border bg-card flex items-center gap-1 rounded-full border p-1 shadow-xs"
    >
      {OPTIONS.map(({ view, label, icon: Icon }) => (
        <Link
          key={view}
          href={buildHref(view)}
          aria-current={active === view ? "true" : undefined}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors",
            active === view
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </div>
  );
}
