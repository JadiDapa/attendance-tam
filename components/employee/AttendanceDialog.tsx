"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CameraIcon as Camera,
  Cross2Icon as Close,
  SewingPinIcon as MapPin,
  ReloadIcon as RefreshCw,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { AttendanceType } from "@/generated/prisma";
import { submitAttendance } from "@/app/action/attendance.action";
import { formatDistance, haversineDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";

type Coords = { latitude: number; longitude: number; accuracy: number };

/** Penjelasan sependek ini tidak bisa dinilai admin — samakan dengan server. */
const MIN_DETAIL_LENGTH = 5;

type Props = {
  type: AttendanceType;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  /** Akurasi GPS terburuk yang diterima server — dicek juga di sini supaya
   *  karyawan tahu sebelum menekan kirim. */
  maxAccuracyMeters: number;
  /**
   * Titik kantor yang aktif. Jaraknya dihitung di sini juga supaya form alasan
   * sudah muncul sebelum kirim — server tetap yang jadi penentu.
   */
  office: { latitude: number; longitude: number; radiusMeters: number };
  /** Pengganti tombol trigger default, mis. baris kartu yang bisa ditekan. */
  trigger?: ReactNode;
};

/** Fix GPS sesegar ini masih boleh dipakai ulang. Absensi tidak butuh presisi
 *  detik-detikan, sementara memaksa fix baru (maximumAge: 0) berarti menunggu
 *  perangkat mengunci satelit dari nol — 7-10 detik di HP. */
const MAX_POSITION_AGE_MS = 30_000;

/** Batas menunggu sebelum menyerah dan memakai pembacaan terbaik yang ada. */
const POSITION_TIMEOUT_MS = 15_000;

/**
 * Membaca lokasi lewat `watchPosition`, bukan `getCurrentPosition`.
 *
 * Perangkat mengirim fix kasar (jaringan/WiFi) dalam ~1 detik lalu
 * memperhalusnya dengan GPS. Karena yang kita butuhkan cuma akurasi di bawah
 * ambang absensi, pembacaan pertama yang sudah cukup akurat langsung dipakai —
 * tidak perlu menunggu perangkat mencapai akurasi terbaiknya.
 *
 * Kalau sampai batas waktu belum ada yang cukup akurat, pembacaan terbaik yang
 * sempat masuk tetap dikembalikan supaya UI bisa menampilkan angka akurasinya
 * beserta tombol baca ulang, bukan menggantung tanpa lokasi sama sekali.
 */
function readPosition(acceptableAccuracy: number): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Perangkat tidak mendukung GPS"));
      return;
    }

    let best: Coords | null = null;
    let watchId = 0;
    let settled = false;

    const settle = (result: Coords | null, error?: Error) => {
      if (settled) return;
      settled = true;

      clearTimeout(timer);
      navigator.geolocation.clearWatch(watchId);

      if (result) resolve(result);
      else
        reject(error ?? new Error("Gagal membaca lokasi. Pastikan GPS aktif."));
    };

    const timer = setTimeout(() => settle(best), POSITION_TIMEOUT_MS);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: Coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        if (!best || coords.accuracy < best.accuracy) best = coords;
        if (coords.accuracy <= acceptableAccuracy) settle(coords);
      },
      (error) =>
        settle(
          best,
          new Error(
            error.code === error.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Aktifkan lokasi lalu coba lagi."
              : "Gagal membaca lokasi. Pastikan GPS aktif.",
          ),
        ),
      {
        enableHighAccuracy: true,
        timeout: POSITION_TIMEOUT_MS,
        maximumAge: MAX_POSITION_AGE_MS,
      },
    );
  });
}

export default function AttendanceDialog({
  type,
  label,
  disabled,
  disabledReason,
  maxAccuracyMeters,
  office,
  trigger,
}: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(
    null,
  );
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Auto-kirim cuma boleh coba sekali per foto — kalau gagal (mis. jaringan
  // putus atau ditolak server), berhenti supaya tidak retry tanpa henti tiap
  // render, dan tunjukkan tombol coba lagi ke karyawan.
  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Kamera tidak tersedia. Buka aplikasi lewat HTTPS atau localhost.",
      );
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 } },
      audio: false,
    });

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
    }

    return stream;
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const prepare = async () => {
      try {
        await startCamera();

        if (cancelled) {
          stopCamera();
          return;
        }

        setPreparing(false);
      } catch (err) {
        if (cancelled) return;

        const message =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Izin kamera ditolak. Aktifkan izin kamera lalu coba lagi."
            : err instanceof Error
              ? err.message
              : "Gagal menyiapkan kamera";

        setError(message);
        setPreparing(false);
      }
    };

    prepare();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  // Lokasi dibaca terpisah dari kamera: dulu keduanya di-`Promise.all` sehingga
  // preview kamera — yang siap dalam hitungan ratusan milidetik — ikut tertahan
  // di balik overlay sampai GPS selesai. Sekarang karyawan bisa langsung
  // mengambil foto sementara lokasi masih menyusul; tombol kirim tetap terkunci
  // sampai koordinatnya terbaca.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    // `locating` sudah true dari nilai awal dan dikembalikan `resetState()`
    // tiap dialog ditutup, jadi tidak perlu di-set ulang di sini.
    readPosition(maxAccuracyMeters)
      .then((position) => {
        if (!cancelled) setCoords(position);
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        setLocationError(
          err instanceof Error ? err.message : "Gagal membaca lokasi",
        );
      })
      .finally(() => {
        if (!cancelled) setLocating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, maxAccuracyMeters]);

  const resetState = () => {
    setPreparing(true);
    setError(null);
    setCoords(null);
    setLocating(true);
    setLocationError(null);
    setDetail("");
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.preview);
      return null;
    });
    setSubmitting(false);
    setAutoSubmitFailed(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);

    if (!next) {
      stopCamera();
      resetState();
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Gagal mengambil foto, coba lagi");
          return;
        }

        stopCamera();
        setAutoSubmitFailed(false);
        setPhoto({
          file: new File([blob], "absensi.jpg", { type: "image/jpeg" }),
          preview: URL.createObjectURL(blob),
        });
      },
      "image/jpeg",
      0.85,
    );
  };

  const retakePhoto = () => {
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.preview);
      return null;
    });
    setPreparing(true);
    setError(null);
    setAutoSubmitFailed(false);

    // Efek [open] tidak jalan lagi, jadi kamera dinyalakan ulang manual.
    startCamera()
      .then(() => setPreparing(false))
      .catch(() => {
        setError("Gagal menyalakan kamera lagi");
        setPreparing(false);
      });
  };

  // Pembacaan GPS yang kasar ditolak server, jadi lebih baik ketahuan di sini
  // selagi karyawan masih bisa pindah ke area terbuka lalu membaca ulang.
  const isAccurate = coords !== null && coords.accuracy <= maxAccuracyMeters;

  const distanceMeters = coords
    ? haversineDistance(
        coords.latitude,
        coords.longitude,
        office.latitude,
        office.longitude,
      )
    : null;

  // Di luar radius kantor absensi tidak langsung sah: karyawan harus menulis
  // alasannya, lalu admin yang menyetujuinya.
  const isOutside =
    distanceMeters !== null && distanceMeters > office.radiusMeters;
  const trimmedDetail = detail.trim();
  const isReasonComplete =
    !isOutside || trimmedDetail.length >= MIN_DETAIL_LENGTH;

  // Pembacaan lama sengaja dibiarkan tampil selama membaca ulang — mengosongkan
  // coords bikin kotak peringatan (berikut tombol ini) hilang saat diklik.
  const refreshLocation = async () => {
    setLocating(true);
    setLocationError(null);

    try {
      setCoords(await readPosition(maxAccuracyMeters));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal membaca lokasi";

      setLocationError(message);
      toast.error(message);
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!photo || !coords) return;

    setSubmitting(true);

    const formData = new FormData();
    formData.set("type", type);
    formData.set("latitude", String(coords.latitude));
    formData.set("longitude", String(coords.longitude));
    formData.set("accuracy", String(coords.accuracy));
    formData.set("photo", photo.file);

    if (isOutside) {
      formData.set("workModeDetail", trimmedDetail);
    }

    const result = await submitAttendance(formData);

    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      setAutoSubmitFailed(true);
      return;
    }

    toast.success(result.message);

    if (result.warning) {
      toast.warning(result.warning, { duration: 8000 });
    }

    handleOpenChange(false);
    router.refresh();
  }, [photo, coords, type, isOutside, trimmedDetail, router]);

  // Karyawan tidak perlu menekan tombol kirim lagi setelah foto berhasil
  // diambil — begitu lokasi cukup akurat, absensi langsung terkirim sendiri.
  // Klaim di luar radius tetap butuh alasan manual, jadi tidak diotomatiskan.
  useEffect(() => {
    if (
      !photo ||
      isOutside ||
      submitting ||
      !coords ||
      !isAccurate ||
      autoSubmitFailed
    )
      return;

    // Ditunda lewat microtask supaya bukan setState sinkron di badan effect
    // (memicu cascading render) — sama seperti pola .then() pada effect lokasi.
    queueMicrotask(() => handleSubmit());
  }, [
    photo,
    coords,
    isAccurate,
    isOutside,
    submitting,
    autoSubmitFailed,
    handleSubmit,
  ]);

  const waitingForLocation = !isOutside && (!coords || !isAccurate);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size="lg"
            disabled={disabled}
            title={disabled ? disabledReason : undefined}
            className="w-full"
          >
            <Camera className="size-4" />
            {label}
          </Button>
        )}
      </DialogTrigger>

      {/* Di layar < lg (HP & tablet) tampil penuh layar ala aplikasi kamera
          bawaan; di layar lg ke atas (desktop) jadi bingkai mirip HP yang
          mengambang di tengah, bukan modal kotak biasa. */}
      <DialogContent
        showCloseButton={false}
        className={cn(
          "inset-0 top-0 left-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-black p-0 text-white ring-0",
          "lg:top-1/2 lg:left-1/2 lg:h-[88vh] lg:max-h-[840px] lg:w-full lg:max-w-[420px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[2.5rem] lg:border-[10px] lg:border-neutral-900 lg:shadow-2xl lg:ring-1 lg:ring-black/10",
        )}
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <DialogDescription className="sr-only">
          Posisikan wajah lalu ambil foto — sisanya berjalan otomatis.
        </DialogDescription>

        <div className="relative flex h-full w-full flex-col overflow-hidden bg-black">
          {/* Area kamera / foto — mengisi seluruh ruang di atas panel bawah */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.preview}
                alt="Foto absensi"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
              />
            )}

            {!photo && !preparing && !error && (
              <>
                {/* Vignette supaya area luar wajah lebih gelap, bukan bidang datar */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_55%_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="border-primary/80 h-[62%] w-[46%] animate-pulse rounded-[50%] border-2 border-dashed shadow-[0_0_0_9999px_rgba(0,0,0,0.15)]" />
                </div>

                {/* Bingkai sudut ala viewfinder kamera, bukan siluet kepala+bahu */}
                <div className="pointer-events-none absolute inset-5">
                  <span className="absolute top-0 left-0 h-6 w-6 rounded-tl-xl border-t-2 border-l-2 border-white/90" />
                  <span className="absolute top-0 right-0 h-6 w-6 rounded-tr-xl border-t-2 border-r-2 border-white/90" />
                  <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-xl border-b-2 border-l-2 border-white/90" />
                  <span className="absolute right-0 bottom-0 h-6 w-6 rounded-br-xl border-r-2 border-b-2 border-white/90" />
                </div>

                <div className="pointer-events-none absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/70 to-transparent px-4 pt-10 pb-4 text-center text-xs font-medium text-white">
                  Posisikan wajah di dalam bingkai
                </div>
              </>
            )}

            {(preparing || error) && !photo && (
              <div className="bg-black/90 absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                {error ? (
                  <p className="text-sm text-red-200">{error}</p>
                ) : (
                  <>
                    <Spinner className="size-5 text-white" />
                    <p className="text-sm text-white/70">
                      Menyiapkan kamera...
                    </p>
                  </>
                )}
              </div>
            )}

            {photo && (submitting || waitingForLocation) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-center backdrop-blur-[2px]">
                <Spinner className="size-6 text-white" />
                <p className="px-4 text-sm font-medium text-white">
                  {submitting
                    ? "Mengirim absensi..."
                    : "Menunggu lokasi terbaca..."}
                </p>
              </div>
            )}

            {/* Bar atas: tombol tutup + status lokasi, aman dari notch/status bar HP */}
            <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <DialogClose asChild>
                <button
                  type="button"
                  disabled={submitting}
                  aria-label="Tutup"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Close className="size-4" />
                </button>
              </DialogClose>

              {coords ? (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium backdrop-blur-sm",
                    isAccurate
                      ? "bg-emerald-500/20 text-emerald-100"
                      : "bg-destructive/25 text-red-100",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isAccurate ? "bg-emerald-400" : "bg-red-400",
                    )}
                  />
                  ±{Math.round(coords.accuracy)} m
                  {locating && " · memperbarui"}
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                  <MapPin className="size-3" />
                  {locating ? "Membaca lokasi..." : "Lokasi belum terbaca"}
                </span>
              )}
            </div>
          </div>

          {/* Panel bawah: berubah bentuk sesuai tahap — rana kamera, ulangi
              foto, atau formulir alasan luar radius. */}
          <div
            className={cn(
              "relative z-10 flex shrink-0 flex-col gap-3 px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
              photo && isOutside
                ? "rounded-t-3xl bg-white text-neutral-900 shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
                : "bg-black",
            )}
          >
            {photo && isOutside && (
              <div className="mx-auto -mt-1 h-1.5 w-10 rounded-full bg-neutral-300" />
            )}

            {!photo && (
              <>
                {!coords && !locating && (
                  <div className="flex flex-col gap-2 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-xs text-red-100">
                    <p>{locationError ?? "Lokasi belum terbaca"}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={refreshLocation}
                      className="self-start border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    >
                      <RefreshCw className="size-3.5" />
                      Baca ulang lokasi
                    </Button>
                  </div>
                )}

                {coords && !isAccurate && (
                  <div className="flex flex-col gap-2 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-xs text-red-100">
                    <p>
                      Akurasi lokasi terlalu rendah (±
                      {Math.round(coords.accuracy)} m, maksimal ±
                      {maxAccuracyMeters} m). Pindah ke area terbuka lalu baca
                      ulang lokasinya.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={refreshLocation}
                      disabled={locating}
                      className="self-start border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    >
                      <RefreshCw className="size-3.5" />
                      Baca ulang lokasi
                    </Button>
                  </div>
                )}

                {/* Tombol rana ala kamera HP */}
                <div className="flex items-center justify-center py-1">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={preparing || !!error || !coords || !isAccurate}
                    aria-label="Ambil foto"
                    className="flex size-[72px] items-center justify-center rounded-full border-4 border-white/90 transition active:scale-95 disabled:cursor-not-allowed disabled:border-white/30"
                  >
                    <span
                      className={cn(
                        "size-[56px] rounded-full bg-white transition",
                        (preparing || !!error || !coords || !isAccurate) &&
                          "bg-white/40",
                      )}
                    />
                  </button>
                </div>
              </>
            )}

            {photo && !isOutside && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={retakePhoto}
                  disabled={submitting}
                  className={cn(
                    "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white",
                    !autoSubmitFailed && "w-full",
                  )}
                >
                  <RefreshCw className="size-4" />
                  Ulangi
                </Button>

                {autoSubmitFailed && (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!coords || !isAccurate || submitting}
                    className="flex-1"
                  >
                    {submitting && <Spinner />}
                    Coba Lagi
                  </Button>
                )}
              </div>
            )}

            {photo && isOutside && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">
                    Kamu {formatDistance(distanceMeters!)} dari kantor
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Tulis penjelasan singkat kenapa kamu absen di luar kantor.
                    Absensi ini menunggu persetujuan admin, dan tidak dihitung
                    terlambat.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="workModeDetail">Penjelasan</Label>
                  <Textarea
                    id="workModeDetail"
                    rows={2}
                    value={detail}
                    onChange={(event) => setDetail(event.target.value)}
                    maxLength={300}
                    placeholder="Contoh: kunjungan klien di Bekasi bersama Pak Adi"
                  />
                  {trimmedDetail.length < MIN_DETAIL_LENGTH && (
                    <p className="text-muted-foreground text-xs">
                      Tulis minimal {MIN_DETAIL_LENGTH} karakter supaya admin
                      bisa menilainya.
                    </p>
                  )}
                </div>

                <p className="text-muted-foreground text-xs">
                  Sakit, izin, atau cuti tidak diajukan dari sini — pakai menu
                  Izin &amp; Cuti.
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={retakePhoto}
                    disabled={submitting}
                  >
                    <RefreshCw className="size-4" />
                    Ulangi
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                      !coords || !isAccurate || !isReasonComplete || submitting
                    }
                    className="flex-1"
                  >
                    {submitting && <Spinner />}
                    Kirim Absensi
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
