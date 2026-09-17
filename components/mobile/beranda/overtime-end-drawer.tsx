"use client";

import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

/** Mirrors mobile's `OvertimeEndDrawer`. */
export function OvertimeEndDrawer({
  open,
  startedAtLabel,
  submitting,
  onClose,
  onEnd,
}: {
  open: boolean;
  startedAtLabel: string;
  submitting: boolean;
  onClose: () => void;
  /** `endTime` empty means "now". */
  onEnd: (endTime?: string) => void;
}) {
  const [endTime, setEndTime] = useState("");
  const [useCustomTime, setUseCustomTime] = useState(false);

  function handleClose() {
    setUseCustomTime(false);
    setEndTime("");
    onClose();
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && handleClose()}>
      <DrawerContent className="md:hidden">
        <div className="flex flex-col gap-4 p-2">
          <h2 className="text-foreground text-center text-base font-bold">
            Selesaikan Lembur
          </h2>
          <p className="text-muted-foreground text-center text-sm">
            Lembur dimulai pukul {startedAtLabel}.
          </p>

          {useCustomTime ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-foreground text-sm font-medium">
                Jam Selesai
              </span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="border-border bg-input rounded-lg border px-3 py-2 text-lg font-bold"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setUseCustomTime(true)}
              className="text-primary py-2 text-center text-sm"
            >
              Pilih jam selesai sendiri
            </button>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="bg-muted text-foreground flex-1 rounded-xl py-3 text-center"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() =>
                onEnd(useCustomTime && endTime ? endTime : undefined)
              }
              disabled={submitting}
              className="bg-primary text-primary-foreground flex-1 rounded-xl py-3 text-center font-medium"
            >
              {useCustomTime && endTime
                ? `Selesai Jam ${endTime}`
                : "Selesai Sekarang"}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
