"use client";

import { useEffect, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const MIN_HOUR = 18; // overtime can only be started from 18:00 onward

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Mirrors mobile's `OvertimeStartDrawer`. */
export function OvertimeStartDrawer({
  open,
  onClose,
  onStart,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onStart: (startTime: string, reason: string) => void;
  submitting: boolean;
}) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- live clock: refresh immediately on open, then tick every second
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [open]);

  const startTimeLabel =
    useCustomTime && customTime ? customTime : formatTime(now);
  const startHour = Number(startTimeLabel.split(":")[0]);
  const isTooEarly = Number.isNaN(startHour) || startHour < MIN_HOUR;

  function resetForm() {
    setUseCustomTime(false);
    setCustomTime("");
    setReason("");
    setReasonError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSubmit() {
    if (isTooEarly) return;

    if (reason.trim().length < 5) {
      setReasonError("Alasan minimal 5 karakter");
      return;
    }
    setReasonError(null);
    onStart(startTimeLabel, reason.trim());
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && handleClose()}>
      <DrawerContent className="md:hidden">
        <div className="flex flex-col gap-4 p-2">
          <h2 className="text-foreground text-center text-base font-bold">
            Mulai Lembur
          </h2>
          <p className="text-muted-foreground text-center text-sm">
            Jam mulai lembur harus pukul 18:00 atau lebih larut.
          </p>

          <div className="flex flex-col gap-1.5">
            <span className="text-foreground text-sm font-medium">
              Waktu Mulai
            </span>

            {useCustomTime ? (
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="border-border bg-input rounded-lg border px-3 py-2 text-2xl font-bold"
              />
            ) : (
              <span className="text-foreground text-2xl font-bold">
                {formatTime(now)}
              </span>
            )}

            {isTooEarly && (
              <span className="text-xs text-red-600 dark:text-red-400">
                Jam mulai harus pukul 18:00 atau lebih larut
              </span>
            )}

            <button
              type="button"
              onClick={() => setUseCustomTime((prev) => !prev)}
              className="text-primary py-1 text-left text-sm"
            >
              {useCustomTime ? "Pakai jam sekarang" : "Pilih jam mulai sendiri"}
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-foreground text-sm font-medium">Alasan</span>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError(null);
              }}
              placeholder="Contoh: menyelesaikan laporan bulanan"
              rows={3}
              className="border-border bg-input rounded-lg border px-3 py-2 text-sm"
            />
            {reasonError && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {reasonError}
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="bg-muted text-foreground flex-1 rounded-xl py-3 text-center"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isTooEarly || submitting}
              className={cn(
                "bg-primary text-primary-foreground flex-1 rounded-xl py-3 text-center font-medium",
                (isTooEarly || submitting) && "opacity-50",
              )}
            >
              Mulai Lembur
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
