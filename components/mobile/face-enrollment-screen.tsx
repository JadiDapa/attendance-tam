"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, CircleCheck, Camera, IdCard } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { enrollFace, resetFaceEnrollment } from "@/app/action/face.action";
import type { FaceStatus } from "@/app/action/face.action";
import { cn } from "@/lib/utils";

/**
 * Full-screen camera flow, mirrors `mobile/src/app/face-enrollment.tsx`.
 * Camera stays live the whole time — each capture is sent immediately to
 * `enrollFace`, no preview/confirm step (unlike `AttendanceDialog`).
 */
export function FaceEnrollmentScreen({ status }: { status: FaceStatus }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [preparing, setPreparing] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [totalPhotos, setTotalPhotos] = useState(status.totalPhotos);

  const { minRequired, recommendedPhotos, maxPhotos } = status;
  const enrolled = totalPhotos >= minRequired;
  const atRecommended = totalPhotos >= recommendedPhotos;
  const atMax = totalPhotos >= maxPhotos;

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
    if (atMax) return;

    let cancelled = false;

    // Ditunda lewat microtask supaya bukan setState sinkron di badan effect
    // (memicu cascading render) — sama seperti pola di `AttendanceDialog`.
    queueMicrotask(() => {
      if (cancelled) return;

      setPreparing(true);
      setCameraError(null);

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
  }, [atMax, startCamera, stopCamera]);

  const handleCapture = async () => {
    const video = videoRef.current;

    if (!video || !video.videoWidth || capturing) return;

    setCapturing(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );

      if (!blob) throw new Error("Gagal mengambil foto, coba lagi");

      const formData = new FormData();
      formData.append("photo", blob, "enrollment.jpg");

      const result = await enrollFace(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setTotalPhotos(result.totalPhotos);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mengambil foto",
      );
    } finally {
      setCapturing(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);

    try {
      const result = await resetFaceEnrollment();

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setTotalPhotos(result.totalPhotos);
      setConfirmReset(false);
    } catch {
      toast.error("Gagal menghapus data wajah, coba lagi");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col bg-black">
      {/* Kamera fullscreen */}
      <div className="absolute inset-0">
        {!atMax && (
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
          />
        )}
      </div>

      {!atMax && !preparing && !cameraError && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ paddingBottom: 120 }}
        >
          <div className="border-primary/80 aspect-square h-[62%] max-h-88 max-w-88 animate-pulse rounded-[50%] border-2 border-dashed" />
        </div>
      )}

      {(preparing || cameraError) && !atMax && (
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

      {/* Bar atas */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Kembali"
          className="flex size-10 items-center justify-center rounded-full bg-black/40"
        >
          <ChevronLeft className="size-5 text-white" />
        </button>

        <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1">
          <span className="text-xs text-white">
            {totalPhotos}/{atRecommended ? recommendedPhotos : minRequired} foto
          </span>
        </div>
      </div>

      {/* Info status */}
      <div
        className="absolute inset-x-3 z-10 flex items-start gap-3 rounded-2xl bg-black/50 p-3"
        style={{ top: "max(4rem, calc(env(safe-area-inset-top) + 4rem))" }}
      >
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            enrolled ? "bg-primary/25" : "bg-white/15",
          )}
        >
          {enrolled ? (
            <CircleCheck className="size-5 text-white" />
          ) : (
            <IdCard className="size-5 text-white" />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold text-white">
            {enrolled
              ? "Wajah kamu sudah terdaftar"
              : "Wajah kamu belum terdaftar"}
          </p>

          <p className="text-xs text-white/80">
            {atRecommended
              ? `${totalPhotos} foto tersimpan. Data ini dipakai untuk memverifikasi kamu saat absen.`
              : enrolled
                ? `${totalPhotos} foto tersimpan, kamu sudah bisa absen. Disarankan menambah hingga ${recommendedPhotos} foto dari sudut/pencahayaan berbeda untuk akurasi lebih baik.`
                : `Ambil minimal ${minRequired} foto wajah (disarankan ${recommendedPhotos}) dari sudut/pencahayaan berbeda (${totalPhotos}/${minRequired} tersimpan) sebelum bisa absen.`}
          </p>
        </div>
      </div>

      {/* Bottom actions */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-4 px-5"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        {!atMax && (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleCapture}
              disabled={capturing || preparing || !!cameraError}
              className="flex size-20 items-center justify-center rounded-full bg-white disabled:opacity-60"
            >
              {capturing ? (
                <Spinner className="size-5 text-black" />
              ) : (
                <Camera className="size-8 text-black" />
              )}
            </button>

            <p className="text-sm font-medium text-white">
              {capturing
                ? "Menyimpan foto..."
                : enrolled
                  ? "Tambah Foto Lagi"
                  : "Ambil & Simpan Foto"}
            </p>
          </div>
        )}

        {totalPhotos > 0 && (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            disabled={resetting}
            className="flex items-center justify-center gap-2 rounded-xl bg-black/40 py-2.5 disabled:opacity-60"
          >
            {resetting && <Spinner className="size-4 text-white" />}
            <span className="text-sm font-medium text-red-300">
              Hapus &amp; daftar ulang
            </span>
          </button>
        )}

        {enrolled && (
          <button
            type="button"
            onClick={() => router.back()}
            className="items-center rounded-xl border border-white/40 bg-black/40 py-3.5 text-center"
          >
            <span className="font-medium text-white">Selesai</span>
          </button>
        )}
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus semua foto wajah?</AlertDialogTitle>
            <AlertDialogDescription>
              {totalPhotos} foto terdaftar akan dihapus. Kamu tidak akan bisa
              absen sampai mendaftar ulang minimal {minRequired} foto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={resetting}
              onClick={(event) => {
                event.preventDefault();
                void handleReset();
              }}
            >
              {resetting && <Spinner className="size-4" />}
              Hapus &amp; daftar ulang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
