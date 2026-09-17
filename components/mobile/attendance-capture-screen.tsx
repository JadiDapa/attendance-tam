"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, CircleCheck, MapPin, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { AttendanceType } from "@/generated/prisma";
import { submitAttendance } from "@/app/action/attendance.action";
import {
  formatDistance,
  haversineDistance,
  readAccuratePosition,
  type GeoCoords,
} from "@/lib/geo";
import { cn } from "@/lib/utils";

/** Sama dengan `MIN_DETAIL_LENGTH` di `attendance.action.ts` — cuma dipakai untuk validasi sisi klien sebelum kirim, server tetap penentu akhir. */
const MIN_DETAIL_LENGTH = 5;

type Office = { latitude: number; longitude: number; radiusMeters: number };

/**
 * Full-page check-in/out flow, mirrors `mobile/src/app/attendance-capture.tsx`.
 * Reuses the same camera+GPS+auto-submit logic as `AttendanceDialog`
 * (desktop's dialog version) — just laid out full-screen with a back button
 * and bottom sheet instead of a modal, per the mobile source.
 */
export function AttendanceCaptureScreen({
  type,
  label,
  faceEnrolled,
  office,
  maxAccuracyMeters,
}: {
  type: AttendanceType;
  label: string;
  faceEnrolled: boolean;
  office: Office | null;
  maxAccuracyMeters: number;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [preparing, setPreparing] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(
    null,
  );
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const canRunFlow = faceEnrolled && office !== null;

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
  }, []);

  useEffect(() => {
    if (!canRunFlow) return;

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      startCamera()
        .then(() => {
          if (cancelled) stopCamera();
        })
        .catch((err: unknown) => {
          if (cancelled) return;

          setCameraError(
            err instanceof DOMException && err.name === "NotAllowedError"
              ? "Izin kamera ditolak. Aktifkan izin kamera lalu coba lagi."
              : err instanceof Error
                ? err.message
                : "Gagal menyiapkan kamera",
          );
        })
        .finally(() => {
          if (!cancelled) setPreparing(false);
        });
    });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [canRunFlow, startCamera, stopCamera]);

  const startLocating = useCallback(() => {
    setLocating(true);
    setLocationError(null);

    readAccuratePosition(maxAccuracyMeters)
      .then((position) => setCoords(position))
      .catch((err: unknown) => {
        setLocationError(
          err instanceof Error ? err.message : "Gagal membaca lokasi",
        );
      })
      .finally(() => setLocating(false));
  }, [maxAccuracyMeters]);

  useEffect(() => {
    if (!canRunFlow) return;

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      startLocating();
    });

    return () => {
      cancelled = true;
    };
  }, [canRunFlow, startLocating]);

  const isAccurate = coords !== null && coords.accuracy <= maxAccuracyMeters;

  const distanceMeters =
    coords && office
      ? haversineDistance(
          coords.latitude,
          coords.longitude,
          office.latitude,
          office.longitude,
        )
      : null;

  const isOutside =
    distanceMeters !== null && office !== null && distanceMeters > office.radiusMeters;
  const trimmedDetail = detail.trim();
  const isReasonComplete =
    !isOutside || trimmedDetail.length >= MIN_DETAIL_LENGTH;

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
    setAutoSubmitFailed(false);
    setHasSubmitted(false);
    setPreparing(true);
    setCameraError(null);

    startCamera()
      .then(() => setPreparing(false))
      .catch(() => {
        setCameraError("Gagal menyalakan kamera lagi");
        setPreparing(false);
      });
  };

  const handleSubmit = useCallback(async () => {
    if (!photo || !coords || submitting || hasSubmitted) return;

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

    setHasSubmitted(true);
    toast.success(result.message);

    if (result.warning) {
      toast.warning(result.warning, { duration: 8000 });
    }

    router.back();
    router.refresh();
  }, [photo, coords, type, isOutside, trimmedDetail, submitting, hasSubmitted, router]);

  // Di dalam radius: begitu foto & lokasi siap, absensi terkirim otomatis —
  // sama seperti `AttendanceDialog`.
  useEffect(() => {
    if (
      !photo ||
      isOutside ||
      submitting ||
      !coords ||
      !isAccurate ||
      autoSubmitFailed ||
      hasSubmitted
    )
      return;

    queueMicrotask(() => void handleSubmit());
  }, [
    photo,
    coords,
    isAccurate,
    isOutside,
    submitting,
    autoSubmitFailed,
    hasSubmitted,
    handleSubmit,
  ]);

  if (!faceEnrolled) {
    return (
      <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center gap-4 px-6 text-center md:hidden">
        <p className="text-foreground text-base">
          Wajah kamu belum terdaftar. Daftarkan wajah dulu di halaman Profil
          sebelum bisa absen.
        </p>
        <Button onClick={() => router.replace("/verifikasi-wajah")}>
          Daftarkan Wajah
        </Button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-muted-foreground text-sm"
        >
          Kembali
        </button>
      </div>
    );
  }

  if (!office) {
    return (
      <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center gap-4 px-6 text-center md:hidden">
        <p className="text-foreground text-base">
          Lokasi kantor belum diatur admin. Hubungi admin.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-primary text-sm"
        >
          Kembali
        </button>
      </div>
    );
  }

  const canCapture = !preparing && !cameraError && !!coords && isAccurate;
  const waitingForLocation = !isOutside && (!coords || !isAccurate);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Lapisan media: kamera fullscreen sebelum foto, hasil foto fullscreen sesudahnya */}
      <div className="absolute inset-0">
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
      </div>

      {/* Panduan wajah, hanya saat kamera masih live */}
      {!photo && !preparing && !cameraError && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ paddingBottom: 120 }}
        >
          <div className="border-primary/80 aspect-square h-[62%] max-h-88 max-w-88 animate-pulse rounded-[50%] border-2 border-dashed" />
        </div>
      )}

      {(preparing || cameraError) && !photo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center">
          {cameraError ? (
            <>
              <p className="text-sm text-white">{cameraError}</p>
              <button
                type="button"
                onClick={() => {
                  setPreparing(true);
                  setCameraError(null);
                  startCamera()
                    .then(() => setPreparing(false))
                    .catch(() => {
                      setCameraError("Gagal menyalakan kamera");
                      setPreparing(false);
                    });
                }}
                className="bg-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-medium"
              >
                Izinkan Akses Kamera
              </button>
            </>
          ) : (
            <Spinner className="size-5 text-white" />
          )}
        </div>
      )}

      {/* Bar atas: kembali + status */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => (photo ? retakePhoto() : router.back())}
          aria-label="Kembali"
          className="flex size-10 items-center justify-center rounded-full bg-black/40"
        >
          <ChevronLeft className="size-5 text-white" />
        </button>

        {photo && (
          <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1">
            <CircleCheck className="size-3.5 text-white" />
            <span className="text-xs font-medium text-white">Foto diambil</span>
          </div>
        )}
      </div>

      {/* Danger overlay: di luar radius kantor, baru muncul setelah foto diambil */}
      {photo && isOutside && isAccurate && (
        <div
          className="absolute inset-x-3 z-10 flex items-start gap-2 rounded-2xl border border-red-400/60 bg-red-500/90 p-3 shadow-lg shadow-black/30"
          style={{ top: "max(4rem, calc(env(safe-area-inset-top) + 4rem))" }}
        >
          <TriangleAlert className="mt-0.5 size-4.5 shrink-0 text-white" />
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-sm font-semibold text-white">
              Kamu {formatDistance(distanceMeters!)} dari kantor
            </p>
            <p className="text-xs text-white/90">
              Absensi ini menunggu persetujuan admin dan tidak dihitung
              terlambat.
            </p>
          </div>
        </div>
      )}

      {/* Loading overlay: menunggu lokasi terbaca / mengirim absensi */}
      {photo && (submitting || waitingForLocation) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/55">
          <Spinner className="size-6 text-white" />
          <p className="px-4 text-center text-sm font-medium text-white">
            {submitting ? "Mengirim absensi..." : "Menunggu lokasi terbaca..."}
          </p>
        </div>
      )}

      {/* Tombol jepret + kartu lokasi, hanya saat kamera masih live */}
      {!photo && (
        <div
          className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 px-4"
          style={{ paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
        >
          <div className="flex w-full flex-col gap-2 rounded-2xl bg-black/55 p-3">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-white" />
              <span className="flex-1 text-xs font-medium text-white">
                Lokasi Saat Ini
              </span>
              <button
                type="button"
                onClick={startLocating}
                disabled={locating}
                className="rounded-full bg-white/15 p-1.5 disabled:opacity-50"
              >
                <RefreshCw className="size-3.5 text-white" />
              </button>
            </div>

            {locating && !coords ? (
              <div className="flex items-center gap-2">
                <Spinner className="size-4 text-white" />
                <span className="text-xs text-white/80">Membaca lokasi...</span>
              </div>
            ) : coords ? (
              <>
                <p className="line-clamp-2 text-xs text-white">
                  {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isAccurate ? "bg-emerald-400" : "bg-red-400",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs",
                      isAccurate ? "text-emerald-200" : "text-red-200",
                    )}
                  >
                    Akurasi ±{Math.round(coords.accuracy)} m
                    {!isAccurate ? ` (maks ±${maxAccuracyMeters} m)` : ""}
                    {locating ? " · memperbarui" : ""}
                  </span>
                </div>
                {!isAccurate && (
                  <p className="text-[11px] text-white/70">
                    Pindah ke area terbuka lalu baca ulang lokasi.
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-red-200">
                {locationError ?? "Lokasi belum terbaca"}
              </p>
            )}
          </div>

          <p className="text-xs text-white/80">
            {coords && !isAccurate
              ? "Akurasi lokasi kurang"
              : !coords
                ? "Menunggu lokasi..."
                : "Posisikan wajah di dalam bingkai"}
          </p>

          <button
            type="button"
            onClick={capturePhoto}
            disabled={!canCapture}
            aria-label="Ambil foto"
            className="flex size-20 items-center justify-center rounded-full border-4 border-white/40 bg-white/90 disabled:opacity-50"
          >
            <span className="size-16 rounded-full border-2 border-black/10 bg-white" />
          </button>
        </div>
      )}

      {/* Bottom sheet: detail & aksi, muncul setelah foto diambil */}
      {photo && (
        <div
          className="bg-background absolute inset-x-0 bottom-0 z-10 flex max-h-[70%] flex-col gap-3 overflow-y-auto rounded-t-3xl p-5"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          <p className="text-foreground text-center text-lg font-bold">{label}</p>

          {coords && (
            <p className="text-muted-foreground text-center text-xs">
              {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
            </p>
          )}

          {isOutside && isAccurate && (
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
                  Tulis minimal {MIN_DETAIL_LENGTH} karakter supaya admin bisa
                  menilainya.
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Sakit, izin, atau cuti tidak diajukan dari sini — pakai menu
                Izin &amp; Cuti.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={retakePhoto}
              disabled={submitting}
              className={cn("flex-1", !isOutside && !autoSubmitFailed && "w-full")}
            >
              Ulangi
            </Button>

            {isOutside ? (
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!coords || !isAccurate || !isReasonComplete || submitting}
                className="flex-1"
              >
                {submitting && <Spinner />}
                Kirim Absensi
              </Button>
            ) : (
              autoSubmitFailed && (
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!coords || !isAccurate || submitting}
                  className="flex-1"
                >
                  {submitting && <Spinner />}
                  Coba Lagi
                </Button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
