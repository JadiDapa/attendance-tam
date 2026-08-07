"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { AttendanceType } from "@/generated/prisma";
import { submitAttendance } from "@/app/action/attendance.action";

type Coords = { latitude: number; longitude: number; accuracy: number };

type Props = {
  type: AttendanceType;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  /** Akurasi GPS terburuk yang diterima server — dicek juga di sini supaya
   *  karyawan tahu sebelum menekan kirim. */
  maxAccuracyMeters: number;
};

function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Perangkat tidak mendukung GPS"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Aktifkan lokasi lalu coba lagi."
              : "Gagal membaca lokasi. Pastikan GPS aktif.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export default function AttendanceDialog({
  type,
  label,
  disabled,
  disabledReason,
  maxAccuracyMeters,
}: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

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
        const [, position] = await Promise.all([
          startCamera(),
          getCurrentPosition(),
        ]);

        if (cancelled) {
          stopCamera();
          return;
        }

        setCoords(position);
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

  const resetState = () => {
    setPreparing(true);
    setError(null);
    setCoords(null);
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.preview);
      return null;
    });
    setSubmitting(false);
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

  const refreshLocation = async () => {
    setCoords(null);

    try {
      setCoords(await getCurrentPosition());
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal membaca lokasi",
      );
    }
  };

  const handleSubmit = async () => {
    if (!photo || !coords) return;

    setSubmitting(true);

    const formData = new FormData();
    formData.set("type", type);
    formData.set("latitude", String(coords.latitude));
    formData.set("longitude", String(coords.longitude));
    formData.set("accuracy", String(coords.accuracy));
    formData.set("photo", photo.file);

    const result = await submitAttendance(formData);

    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);

    if (result.warning) {
      toast.warning(result.warning, { duration: 8000 });
    }

    handleOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
          className="w-full"
        >
          <Camera className="size-4" />
          {label}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Ambil foto dan pastikan lokasi kamu terbaca sebelum mengirim.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted relative aspect-4/3 w-full overflow-hidden rounded-lg">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.preview}
              alt="Foto absensi"
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}

          {(preparing || error) && !photo && (
            <div className="bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : (
                <>
                  <Spinner className="size-5" />
                  <p className="text-muted-foreground text-sm">
                    Menyiapkan kamera & lokasi...
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-muted-foreground flex items-start gap-2 text-xs">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            {coords ? (
              <span>
                {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                <span className="ml-1">
                  (akurasi ±{Math.round(coords.accuracy)} m)
                </span>
              </span>
            ) : (
              <span>Lokasi belum terbaca</span>
            )}
          </div>

          {coords && !isAccurate && (
            <div className="border-destructive/40 bg-destructive/10 text-destructive flex flex-col gap-2 rounded-lg border p-3 text-xs">
              <p>
                Akurasi lokasi terlalu rendah (±{Math.round(coords.accuracy)} m,
                maksimal ±{maxAccuracyMeters} m). Pindah ke area terbuka lalu
                baca ulang lokasinya.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={refreshLocation}
                className="self-start"
              >
                <RefreshCw className="size-3.5" />
                Baca ulang lokasi
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {photo ? (
            <Button
              type="button"
              variant="outline"
              onClick={retakePhoto}
              disabled={submitting}
            >
              <RefreshCw className="size-4" />
              Ulangi
            </Button>
          ) : (
            <Button
              type="button"
              onClick={capturePhoto}
              disabled={preparing || !!error}
            >
              <Camera className="size-4" />
              Ambil Foto
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!photo || !coords || !isAccurate || submitting}
          >
            {submitting && <Spinner />}
            Kirim Absensi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
