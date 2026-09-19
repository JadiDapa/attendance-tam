"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { confirmMissedCheckout } from "@/app/action/attendance.action";

/** Jam pulang otomatis — harus sama dengan `DEFAULT_MISSED_CHECKOUT_TIME` di server. */
const AUTO_TIME = "17:00";

export type MissedCheckoutDay = {
  /** "YYYY-MM-DD" */
  value: string;
  /** Label siap tampil, mis. "Senin, 14 September 2026". */
  label: string;
};

/**
 * Dialog pemblokir: muncul kalau ada hari sebelumnya yang sudah absen masuk
 * tapi belum absen pulang. Tidak bisa ditutup tanpa memutuskan — server juga
 * menolak absen masuk baru selama masih ada hari yang menggantung.
 *
 * Karyawan cukup menekan "Otomatis pukul 17:00" tanpa memilih jam sendiri;
 * memilih jam manual tetap tersedia kalau pulangnya memang berbeda.
 */
export default function MissedCheckoutDialog({
  days,
}: {
  days: MissedCheckoutDay[];
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState(false);
  const [time, setTime] = useState(AUTO_TIME);

  const current = days[0];

  if (!current) return null;

  const busy = saving || refreshing;

  async function confirm(chosenTime: string) {
    if (!current) return;

    setSaving(true);

    // `time` kosong = server memakai jam otomatis 17:00.
    const result = await confirmMissedCheckout({
      workDate: current.value,
      time: chosenTime,
    });

    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setCustom(false);
    setTime(AUTO_TIME);
    startRefresh(() => router.refresh());
  }

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Absen Pulang Terlewat</DialogTitle>
          <DialogDescription>
            Kamu belum absen pulang pada {current.label}. Konfirmasi dulu
            sebelum absen masuk hari ini.
            {days.length > 1 && ` (${days.length} hari belum dikonfirmasi)`}
          </DialogDescription>
        </DialogHeader>

        {custom && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="missed-checkout-time">Jam pulang</Label>
            <Input
              id="missed-checkout-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              disabled={busy}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
          {custom ? (
            <Button
              type="button"
              disabled={busy || !time}
              onClick={() => void confirm(time)}
            >
              {busy && <Spinner />}
              Konfirmasi pulang {time}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={busy}
              onClick={() => void confirm("")}
            >
              {busy && <Spinner />}
              Otomatis pukul {AUTO_TIME}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setCustom((value) => !value)}
          >
            {custom ? "Pakai otomatis saja" : "Pilih jam sendiri"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
