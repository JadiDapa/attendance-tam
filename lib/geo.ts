const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Jarak dua koordinat dalam meter (haversine). */
export function haversineDistance(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) {
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

/** "120 m" atau "1,4 km" untuk ditampilkan ke user. */
export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;

  return `${(meters / 1000).toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  })} km`;
}

export type GeoCoords = { latitude: number; longitude: number; accuracy: number };

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
 *
 * Dipakai bersama oleh `AttendanceDialog` (desktop) dan
 * `AttendanceCaptureScreen` (mobile-parity `/absen`) — jangan digandakan.
 */
export function readAccuratePosition(acceptableAccuracy: number): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Perangkat tidak mendukung GPS"));
      return;
    }

    let best: GeoCoords | null = null;
    let watchId = 0;
    let settled = false;

    const settle = (result: GeoCoords | null, error?: Error) => {
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
        const coords: GeoCoords = {
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
