"use client";

import { useEffect, useRef, useState } from "react";
import { divIcon } from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
};

/**
 * Pin dibuat dari HTML, bukan gambar — ikon bawaan Leaflet menunjuk ke file PNG
 * di dalam paketnya dan URL-nya rusak begitu di-bundle.
 */
const pinIcon = divIcon({
  className: "",
  html: `<span style="display:block;width:22px;height:22px;border-radius:9999px;background:var(--primary);border:3px solid var(--background);box-shadow:0 1px 6px rgba(0,0,0,.45)"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const round = (value: number) => Number(value.toFixed(7));

/** Klik di peta = pindahkan titik kantor. */
function ClickHandler({ onChange }: Pick<Props, "onChange">) {
  useMapEvents({
    click: (event) =>
      onChange({
        latitude: round(event.latlng.lat),
        longitude: round(event.latlng.lng),
      }),
  });

  return null;
}

/** Ikuti koordinat yang diubah dari luar peta (input manual / tombol GPS). */
function Recenter({ latitude, longitude }: Pick<Props, "latitude" | "longitude">) {
  const map = useMap();
  const previous = useRef({ latitude, longitude });

  useEffect(() => {
    const moved =
      previous.current.latitude !== latitude ||
      previous.current.longitude !== longitude;

    if (!moved) return;

    previous.current = { latitude, longitude };
    map.panTo([latitude, longitude]);
  }, [map, latitude, longitude]);

  return null;
}

const METERS_PER_DEGREE = 111_320;

/** Radius berubah → sesuaikan zoom supaya lingkarannya tetap muat di layar. */
function FitRadius({
  latitude,
  longitude,
  radiusMeters,
}: Omit<Props, "onChange">) {
  const map = useMap();

  useEffect(() => {
    const latDelta = radiusMeters / METERS_PER_DEGREE;
    const lngDelta =
      radiusMeters /
      (METERS_PER_DEGREE * Math.cos((latitude * Math.PI) / 180) || 1);

    map.fitBounds(
      [
        [latitude - latDelta, longitude - lngDelta],
        [latitude + latDelta, longitude + lngDelta],
      ],
      { padding: [32, 32], maxZoom: 18, animate: true },
    );
    // Hanya saat radius berubah — geser pin diurus <Recenter /> tanpa ubah zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusMeters]);

  return null;
}

export default function LocationMap({
  latitude,
  longitude,
  radiusMeters,
  onChange,
}: Props) {
  // Center awal saja; perpindahan berikutnya diurus <Recenter />.
  const [initialCenter] = useState<[number, number]>([latitude, longitude]);

  return (
    <MapContainer
      center={initialCenter}
      zoom={17}
      scrollWheelZoom
      className="z-0 h-72 w-full rounded-xl sm:h-96"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <Circle
        center={[latitude, longitude]}
        radius={radiusMeters}
        // Warna literal: presentation attribute SVG milik Leaflet tidak
        // konsisten membaca CSS variable di semua browser.
        pathOptions={{
          color: "#6366f1",
          weight: 2,
          fillColor: "#6366f1",
          fillOpacity: 0.15,
        }}
      />

      <Marker
        position={[latitude, longitude]}
        icon={pinIcon}
        draggable
        eventHandlers={{
          dragend: (event) => {
            const { lat, lng } = event.target.getLatLng();

            onChange({ latitude: round(lat), longitude: round(lng) });
          },
        }}
      />

      <ClickHandler onChange={onChange} />
      <Recenter latitude={latitude} longitude={longitude} />
      <FitRadius
        latitude={latitude}
        longitude={longitude}
        radiusMeters={radiusMeters}
      />
    </MapContainer>
  );
}
