"use client";

import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Calendar } from "@/components/ui/calendar";

function toDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Mirrors mobile's `SingleDatePicker` — bottom-sheet single-date calendar. */
export function SingleDatePicker({
  open,
  value,
  onClose,
  onApply,
}: {
  open: boolean;
  value: string;
  onClose: () => void;
  onApply: (next: string) => void;
}) {
  const [draft, setDraft] = useState<Date | undefined>(
    value ? toDate(value) : undefined,
  );

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
            Pilih Tanggal
          </h2>

          <Calendar
            mode="single"
            selected={draft}
            onSelect={setDraft}
            defaultMonth={draft}
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
              disabled={!draft}
              onClick={() => draft && onApply(toIso(draft))}
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
