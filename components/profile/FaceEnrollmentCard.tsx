"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, CheckCircle2, RotateCcw, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { enrollFace, resetFaceEnrollment } from "@/app/action/face.action";

type Props = {
  totalPhotos: number;
  minRequired: number;
};

export default function FaceEnrollmentCard({
  totalPhotos: initialTotal,
  minRequired,
}: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [totalPhotos, setTotalPhotos] = useState(initialTotal);

  const enrolled = totalPhotos >= minRequired;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = useCallback(async () => {
    setError(null);
    setPreparing(true);

    try {
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

      setCameraOn(true);
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Izin kamera ditolak. Aktifkan izin kamera lalu coba lagi."
          : err instanceof Error
            ? err.message
            : "Gagal menyiapkan kamera",
      );
    } finally {
      setPreparing(false);
    }
  }, []);

  const captureAndSubmit = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          toast.error("Gagal mengambil foto, coba lagi");
          return;
        }

        setSubmitting(true);

        const formData = new FormData();
        formData.set(
          "photo",
          new File([blob], "enrollment.jpg", { type: "image/jpeg" }),
        );

        const result = await enrollFace(formData);
        setSubmitting(false);

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success(result.message);
        setTotalPhotos(result.totalPhotos);
        router.refresh();

        if (result.totalPhotos >= minRequired) {
          stopCamera();
        }
      },
      "image/jpeg",
      0.85,
    );
  };

  const handleReset = async () => {
    setResetting(true);
    const result = await resetFaceEnrollment();
    setResetting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setTotalPhotos(0);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div
          className={
            enrolled
              ? "bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full"
              : "bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full"
          }
        >
          {enrolled ? (
            <CheckCircle2 className="size-4.5" />
          ) : (
            <ScanFace className="size-4.5" />
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">
            {enrolled
              ? "Wajah kamu sudah terdaftar"
              : "Wajah kamu belum terdaftar"}
          </p>
          <p className="text-muted-foreground text-xs">
            {enrolled
              ? `${totalPhotos} foto tersimpan. Data ini dipakai untuk memverifikasi kamu saat absen.`
              : `Ambil ${minRequired} foto wajah dari sudut/pencahayaan berbeda (${totalPhotos}/${minRequired} tersimpan) sebelum bisa absen.`}
          </p>
        </div>
      </div>
      {/* was: {cameraOn && (<div ...><video ref={videoRef} .../></div>)} */}
      <div
        className={
          cameraOn
            ? "bg-muted relative aspect-4/3 w-full max-w-sm overflow-hidden rounded-lg"
            : "hidden"
        }
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full -scale-x-100 object-cover"
        />

        {cameraOn && (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <svg
                viewBox="0 0 200 280"
                className="h-[90%] w-auto opacity-70"
                fill="none"
              >
                {/* head oval — bigger, more elongated (less circular) */}
                <ellipse
                  cx="100"
                  cy="100"
                  rx="80"
                  ry="110"
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                />
                {/* shoulders, anchored to the very bottom of the frame */}
                <path
                  d="M0 280 C0 215 45 205 100 205 C155 205 200 215 200 280
       L200 280 L0 280 Z"
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                />
              </svg>
            </div>

            <p className="absolute right-0 bottom-2 left-0 text-center text-xs text-white drop-shadow">
              Posisikan wajah kamu di dalam garis
            </p>
          </>
        )}
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {!cameraOn ? (
          <Button
            type="button"
            variant={enrolled ? "outline" : "default"}
            onClick={startCamera}
            disabled={preparing}
          >
            {preparing ? <Spinner /> : <Camera className="size-4" />}
            {enrolled ? "Tambah foto lagi" : "Mulai pendaftaran wajah"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={captureAndSubmit}
            disabled={submitting}
          >
            {submitting && <Spinner />}
            <Camera className="size-4" />
            Ambil & Simpan Foto
          </Button>
        )}

        {totalPhotos > 0 && !cameraOn && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting && <Spinner />}
            <RotateCcw className="size-4" />
            Hapus & daftar ulang
          </Button>
        )}
      </div>
    </div>
  );
}
