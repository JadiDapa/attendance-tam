"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  /** "YYYY-MM-DD" */
  date: string;
  label: string;
  /** Halaman yang dituju, mis. "/admin/dashboard" atau "/admin/kehadiran". */
  basePath: string;
  /** Filter status yang sedang aktif — ikut terbawa saat tanggal berubah. */
  status?: string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function shift(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setTime(next.getTime() + days * MS_PER_DAY);

  return next.toISOString().slice(0, 10);
}

export default function DashboardDateNav({
  date,
  label,
  basePath,
  status,
}: Props) {
  const router = useRouter();

  const go = (nextDate: string) => {
    const params = new URLSearchParams({ date: nextDate });
    if (status) params.set("status", status);

    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="border-border bg-card flex items-center gap-1 rounded-full border p-1 shadow-xs">
      <button
        type="button"
        aria-label="Hari sebelumnya"
        onClick={() => go(shift(date, -1))}
        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1.5 transition-colors"
      >
        <ChevronLeft className="size-4" />
      </button>

      <label className="hover:bg-muted relative flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 text-sm font-medium transition-colors">
        <CalendarDays className="text-muted-foreground size-4" />
        <span className="tabular-nums">{label}</span>
        <input
          type="date"
          value={date}
          onChange={(event) => event.target.value && go(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Pilih tanggal"
        />
      </label>

      <button
        type="button"
        aria-label="Hari berikutnya"
        onClick={() => go(shift(date, 1))}
        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1.5 transition-colors"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
