"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Crosshair, MapPin, Radar } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { haversineDistance, formatDistance } from "@/lib/geo";
import { saveOfficeLocation } from "@/app/action/setting.action";
import {
  OfficeLocationSchema,
  type OfficeLocationDTO,
  type OfficeLocationInput,
} from "@/servers/validators/setting.validator";

// Leaflet menyentuh `window` saat modul dimuat, jadi peta tidak boleh di-SSR.
const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full rounded-xl sm:h-96" />,
});

const RADIUS_MIN = 10;
const RADIUS_MAX = 1000;

type DistanceTest = {
  distanceMeters: number;
  isWithinRadius: boolean;
};

export default function OfficeLocationForm({
  defaultValues,
}: {
  defaultValues: OfficeLocationDTO;
}) {
  const router = useRouter();
  const [locating, setLocating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<DistanceTest | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<OfficeLocationInput, unknown, OfficeLocationDTO>({
    resolver: zodResolver(OfficeLocationSchema),
    defaultValues,
  });

  // Peta & slider mengikuti nilai form supaya input manual, GPS, dan klik peta
  // selalu menunjuk titik yang sama.
  const values = useWatch({ control });
  const latitude = Number(values.latitude) || 0;
  const longitude = Number(values.longitude) || 0;
  const radiusMeters = Number(values.radiusMeters) || RADIUS_MIN;

  const setCoords = (coords: { latitude: number; longitude: number }) => {
    setValue("latitude", coords.latitude, { shouldValidate: true });
    setValue("longitude", coords.longitude, { shouldValidate: true });
    setTest(null);
  };

  const onSubmit = handleSubmit(async (formValues) => {
    const result = await saveOfficeLocation(formValues);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.refresh();
  });

  /** Baca GPS sekali; dipakai tombol "Pakai lokasi saya" dan "Tes jarak". */
  const readPosition = (onFound: (position: GeolocationPosition) => void) => {
    if (!navigator.geolocation) {
      toast.error("Perangkat tidak mendukung GPS");
      return false;
    }

    navigator.geolocation.getCurrentPosition(onFound, () => {
      setLocating(false);
      setTesting(false);
      toast.error("Gagal membaca lokasi. Pastikan izin lokasi aktif.");
    }, { enableHighAccuracy: true, timeout: 15000 });

    return true;
  };

  const useCurrentPosition = () => {
    setLocating(true);

    const started = readPosition((position) => {
      setCoords({
        latitude: Number(position.coords.latitude.toFixed(7)),
        longitude: Number(position.coords.longitude.toFixed(7)),
      });
      setLocating(false);
      toast.success("Titik kantor dipindah ke lokasi kamu sekarang");
    });

    if (!started) setLocating(false);
  };

  const testDistance = () => {
    setTesting(true);

    const started = readPosition((position) => {
      const distanceMeters = haversineDistance(
        position.coords.latitude,
        position.coords.longitude,
        latitude,
        longitude,
      );

      setTest({
        distanceMeters,
        isWithinRadius: distanceMeters <= radiusMeters,
      });
      setTesting(false);
    });

    if (!started) setTesting(false);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <LocationMap
          latitude={latitude}
          longitude={longitude}
          radiusMeters={radiusMeters}
          onChange={setCoords}
        />
        <p className="text-muted-foreground text-xs">
          Klik di peta atau geser pin untuk memindahkan titik kantor. Lingkaran
          menunjukkan radius absensi yang berlaku.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nama lokasi</Label>
        <Input id="name" {...register("name")} />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            {...register("latitude")}
          />
          {errors.latitude && (
            <p className="text-destructive text-sm">
              {errors.latitude.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            {...register("longitude")}
          />
          {errors.longitude && (
            <p className="text-destructive text-sm">
              {errors.longitude.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="radiusMeters">Radius absensi</Label>
          <span className="text-sm font-semibold tabular-nums">
            {radiusMeters} m
          </span>
        </div>

        <Slider
          value={[Math.min(Math.max(radiusMeters, RADIUS_MIN), RADIUS_MAX)]}
          min={RADIUS_MIN}
          max={RADIUS_MAX}
          step={10}
          onValueChange={([next]) => {
            setValue("radiusMeters", next, { shouldValidate: true });
            setTest(null);
          }}
          aria-label="Radius absensi dalam meter"
        />

        <Input
          id="radiusMeters"
          type="number"
          min={10}
          max={5000}
          className="w-32"
          {...register("radiusMeters")}
        />
        <p className="text-muted-foreground text-xs">
          Slider sampai {RADIUS_MAX} m; isi manual di kolom di atas kalau perlu
          lebih besar (maksimal 5000 m).
        </p>
        {errors.radiusMeters && (
          <p className="text-destructive text-sm">
            {errors.radiusMeters.message}
          </p>
        )}
      </div>

      {test && (
        <Alert variant={test.isWithinRadius ? "default" : "destructive"}>
          <Radar className="size-4" />
          <AlertTitle>
            {test.isWithinRadius ? "Dalam radius" : "Di luar radius"}
          </AlertTitle>
          <AlertDescription>
            Posisi kamu sekarang {formatDistance(test.distanceMeters)} dari titik
            kantor (radius {radiusMeters} m).
            {!test.isWithinRadius &&
              " Karyawan di posisi ini tidak akan terhitung absen dalam radius."}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : <MapPin className="size-4" />}
          Simpan Lokasi
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={useCurrentPosition}
          disabled={locating}
        >
          {locating ? <Spinner /> : <Crosshair className="size-4" />}
          Pakai lokasi saya
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={testDistance}
          disabled={testing}
        >
          {testing ? <Spinner /> : <Radar className="size-4" />}
          Tes jarak dari posisi saya
        </Button>
      </div>
    </form>
  );
}
