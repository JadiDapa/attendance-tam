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
