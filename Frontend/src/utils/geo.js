const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two lat/lng points, in kilometers. */
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * The nearest delivery area whose admin-configured center point + radius
 * (migration 029) actually contains the given pin, or null if none does.
 * Areas with no center/radius configured are skipped entirely — never
 * guessed at — so this only ever "finds" a real, admin-defined match.
 */
export function matchDeliveryArea(areas, lat, lng) {
  let best = null;
  let bestDistanceKm = Infinity;
  for (const area of areas) {
    if (area.center_latitude == null || area.center_longitude == null || area.radius_km == null) continue;
    const distanceKm = haversineDistanceKm(lat, lng, Number(area.center_latitude), Number(area.center_longitude));
    if (distanceKm <= Number(area.radius_km) && distanceKm < bestDistanceKm) {
      best = area;
      bestDistanceKm = distanceKm;
    }
  }
  return best;
}
