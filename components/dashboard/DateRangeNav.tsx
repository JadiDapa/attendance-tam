"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  /** "YYYY-MM-DD" */
  start: string;
  end: string;
  /** Hari ini menurut timezone aplikasi — preset dihitung dari sini, bukan dari jam perangkat. */
  today: string;
  label: string;
  /** Halaman yang dituju, mis. "/dashboard" atau "/admin/rekapan-karyawan". */
  basePath: string;
  /** Query lain yang harus ikut terbawa, mis. tampilan aktif. */
  keepParams?: Record<string, string>;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function monthRange(date: Date) {
  return {
    start: toValue(
      new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
    ),
    end: toValue(
      new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)),
    ),
  };
}

/** Rentang persis satu bulan penuh — dipakai untuk memilih cara geser. */
function isFullMonth(start: string, end: string) {
  const month = monthRange(toDate(start));

  return month.start === start && month.end === end;
}

/**
 * Geser rentang: kalau pas satu bulan penuh, pindah bulan. Kalau rentang bebas,
 * geser sepanjang jumlah harinya supaya periode pembanding tetap sama panjang.
 */
function shift(start: string, end: string, direction: -1 | 1) {
  const startDate = toDate(start);
  const endDate = toDate(end);

  if (isFullMonth(start, end)) {
    return monthRange(
      new Date(
        Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth() + direction,
          1,
        ),
      ),
    );
  }

  const days = (endDate.getTime() - startDate.getTime()) / MS_PER_DAY + 1;
  const offset = days * direction * MS_PER_DAY;

  return {
    start: toValue(new Date(startDate.getTime() + offset)),
    end: toValue(new Date(endDate.getTime() + offset)),
  };
}

/** Pemilih rentang tanggal: panah geser periode + popover isian & preset. */
export default function DateRangeNav({
  start,
  end,
  today,
  label,
  basePath,
  keepParams,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ start, end });

  // Rentang bisa berubah lewat tombol panah, jadi form disamakan setiap dibuka.
  const handleOpenChange = (next: boolean) => {
    if (next) setDraft({ start, end });

    setOpen(next);
  };

  const go = (range: { start: string; end: string }) => {
    const params = new URLSearchParams({ ...keepParams, ...range });

    setOpen(false);
    router.push(`${basePath}?${params.toString()}`);
  };

  const applyPreset = (preset: "this-month" | "last-month" | "last-30") => {
    const endDate = toDate(today);

    if (preset === "this-month") return go(monthRange(endDate));

    if (preset === "last-month") {
      return go(
        monthRange(
          new Date(
            Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - 1, 1),
          ),
        ),
      );
    }

    go({
      start: toValue(new Date(endDate.getTime() - 29 * MS_PER_DAY)),
      end: toValue(endDate),
    });
  };

  return (
    <div className="border-border bg-card flex items-center gap-1 rounded-full border p-1 shadow-xs">
      <button
        type="button"
        aria-label="Periode sebelumnya"
        onClick={() => go(shift(start, end, -1))}
        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1.5 transition-colors"
      >
        <ChevronLeft className="size-4" />
      </button>

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger className="hover:bg-muted flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium transition-colors">
          <CalendarDays className="text-muted-foreground size-4" />
          <span className="tabular-nums">{label}</span>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-72 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="range-start">Dari</Label>
              <Input
                id="range-start"
                type="date"
                value={draft.start}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    start: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="range-end">Sampai</Label>
              <Input
                id="range-end"
                type="date"
                value={draft.end}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    end: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("this-month")}
            >
              Bulan ini
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("last-month")}
            >
              Bulan lalu
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("last-30")}
            >
              30 hari
            </Button>
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={!draft.start || !draft.end}
            onClick={() => go(draft)}
          >
            Terapkan
          </Button>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        aria-label="Periode berikutnya"
        onClick={() => go(shift(start, end, 1))}
        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1.5 transition-colors"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
