"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { confirmMissedCheckout } from "@/app/action/attendance.action";
import type { MissedCheckoutDay } from "@/lib/missed-checkout";
import { cn } from "@/lib/utils";
import { missedCheckoutTimeError } from "@/lib/work-schedule";

/**
 * Mobile `rounded-xl py-3.5` dengan teks RN setinggi ~18px (46px total);
 * `py-3` + baris 20px + border 2px = 46px. `md:` kembali ke `Button` bawaan.
 */
const PRIMARY_BUTTON =
  "h-auto rounded-xl bg-clip-border py-3 md:h-9 md:rounded-lg md:bg-clip-padding md:py-0";

/** Mobile: teks polos `text-sm text-muted-foreground` dalam Pressable `py-1`. */
const SECONDARY_BUTTON =
  "h-auto border-0 py-1 font-normal text-muted-foreground hover:bg-transparent md:h-9 md:border md:py-0 md:font-medium md:text-inherit md:hover:bg-muted";

/**
 * Dialog pemblokir: muncul kalau ada hari sebelumnya yang sudah absen masuk
 * tapi belum absen pulang. Tidak bisa ditutup tanpa memutuskan — server juga
 * menolak absen masuk baru selama masih ada hari yang menggantung.
 *
 * Karyawan cukup menekan "Otomatis pukul HH:mm" (Jam Pulang Hari Kerja hari
 * itu, mis. Sabtu 14:00) tanpa memilih jam sendiri; memilih jam manual tetap
 * tersedia kalau pulangnya memang berbeda. Judul menyebut hari yang
 * dikonfirmasi dan jam masuknya ditampilkan, supaya karyawan tidak mengira
 * yang diminta adalah jam saat ini. Jam harus sesudah jam masuk — aturan yang
 * sama (`missedCheckoutTimeError`) dicek lagi di server sebagai penentu.
 *
 * Satu dialog untuk semua lebar layar: kelas dasarnya menyalin
 * `MissedCheckoutModal` di aplikasi mobile (kartu tengah, overlay hitam 50%
 * tanpa blur, teks rata tengah, tombol utama di atas), lalu `md:` mengembalikan
 * gaya `DialogContent` shadcn supaya desktop tidak berubah. Konten dirakit dari
 * `DialogPortal` + `DialogOverlay` karena `DialogContent` tidak bisa mengatur
 * overlay-nya.
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
  /** null = belum diubah, ikut jam otomatis hari yang sedang dikonfirmasi. */
  const [pickedTime, setPickedTime] = useState<string | null>(null);

  const current = days[0];

  if (!current) return null;

  const busy = saving || refreshing;
  const time = pickedTime ?? current.autoCheckOutTime;
  // Jam otomatis bisa jatuh sebelum jam masuk (mis. masuk di hari libur
  // sesudah Jam Pulang) — kalau begitu karyawan wajib memilih jam sendiri.
  const autoError = missedCheckoutTimeError(
    current.autoCheckOutTime,
    current.checkInTime,
  );
  const showCustom = custom || autoError !== null;
  const timeError = time
    ? missedCheckoutTimeError(time, current.checkInTime)
    : null;

  async function confirm(chosenTime: string) {
    if (!current) return;

    setSaving(true);

    // `time` kosong = server memakai Jam Pulang Hari Kerja tanggal itu.
    const result = await confirmMissedCheckout({
      workDate: current.workDate,
      time: chosenTime,
    });

    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setCustom(false);
    setPickedTime(null);
    startRefresh(() => router.refresh());
  }

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50 supports-backdrop-filter:backdrop-blur-none md:bg-black/80 md:supports-backdrop-filter:backdrop-blur-xs" />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className={cn(
            "bg-card text-card-foreground data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 text-sm duration-100 outline-none",
            // Mobile: `w-full gap-4 rounded-2xl bg-card p-5` di dalam `p-6`.
            "max-w-[calc(100%-3rem)] gap-4 rounded-2xl p-5",
            // Desktop: gaya `DialogContent` bawaan.
            "md:bg-popover md:text-popover-foreground md:ring-foreground/5 md:data-open:zoom-in-95 md:data-closed:zoom-out-95 md:max-w-md md:gap-6 md:rounded-xl md:p-6 md:ring-1",
          )}
        >
          <DialogHeader className="gap-4 text-center md:gap-2 md:text-left">
            <DialogTitle className="leading-6 font-bold md:leading-none md:font-medium">
              Absen pulang hari {current.dayLabel}
            </DialogTitle>
            <DialogDescription>
              Kamu absen masuk pukul {current.checkInTime} tapi belum absen
              pulang hari itu. Isi jam pulang hari {current.dayLabel}, bukan jam
              sekarang, sebelum absen masuk hari ini.
              {days.length > 1 && ` (${days.length} hari belum dikonfirmasi)`}
            </DialogDescription>
          </DialogHeader>

          {showCustom && (
            <div className="flex flex-col gap-1.5 md:gap-2">
              <Label htmlFor="missed-checkout-time">
                Jam pulang hari {current.dayLabel}
              </Label>
              <Input
                id="missed-checkout-time"
                type="time"
                value={time}
                onChange={(event) => setPickedTime(event.target.value)}
                disabled={busy}
                aria-invalid={timeError !== null}
                aria-describedby="missed-checkout-time-hint"
              />
              <p
                id="missed-checkout-time-hint"
                className={cn(
                  "text-xs md:text-sm",
                  timeError ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {timeError ?? `Jam masuk ${current.checkInTime}`}
              </p>
            </div>
          )}

          <DialogFooter className="flex-col gap-4 sm:flex-col sm:space-x-0 md:gap-2">
            {showCustom ? (
              <Button
                type="button"
                className={PRIMARY_BUTTON}
                disabled={busy || !time || timeError !== null}
                onClick={() => void confirm(time)}
              >
                {busy && <Spinner />}
                Konfirmasi Pulang {time}
              </Button>
            ) : (
              <Button
                type="button"
                className={PRIMARY_BUTTON}
                disabled={busy}
                onClick={() => void confirm("")}
              >
                {busy && <Spinner />}
                Otomatis pukul {current.autoCheckOutTime}
              </Button>
            )}

            {autoError === null && (
              <Button
                type="button"
                variant="ghost"
                className={SECONDARY_BUTTON}
                disabled={busy}
                onClick={() => setCustom((value) => !value)}
              >
                {custom ? "Pakai otomatis saja" : "Pilih jam sendiri"}
              </Button>
            )}
          </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
