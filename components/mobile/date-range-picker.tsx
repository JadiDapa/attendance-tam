"use client";

import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange as DayPickerRange } from "react-day-picker";

export type DateRange = { start: string; end: string };

function toDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Mirrors mobile's `DateRangePicker` — bottom-sheet calendar in range mode. */
export function DateRangePicker({
  open,
  value,
  onClose,
  onApply,
  minDate,
}: {
  open: boolean;
  value: DateRange;
  onClose: () => void;
  onApply: (next: DateRange) => void;
  /** ISO date string — disables every day before it. Mirrors mobile's `minDate` prop. */
  minDate?: string;
}) {
  const [draft, setDraft] = useState<DayPickerRange | undefined>({
    from: toDate(value.start),
    to: toDate(value.end),
  });

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent className="md:hidden">
        <div className="flex flex-col gap-4 p-2">
          <h2 className="text-foreground text-center text-base font-bold">
            Pilih Rentang Tanggal
          </h2>

          <Calendar
            mode="range"
            selected={draft}
            onSelect={setDraft}
            defaultMonth={toDate(value.end)}
            disabled={minDate ? { before: toDate(minDate) } : undefined}
            className="mx-auto"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-muted text-foreground flex-1 rounded-xl py-3 text-center"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!draft?.from}
              onClick={() => {
                if (!draft?.from) return;
                onApply({
                  start: toIso(draft.from),
                  end: toIso(draft.to ?? draft.from),
                });
              }}
              className="bg-primary text-primary-foreground flex-1 rounded-xl py-3 text-center font-medium disabled:opacity-50"
            >
              Terapkan
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
