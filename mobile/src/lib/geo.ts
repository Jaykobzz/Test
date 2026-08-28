/** Avstånd och positioner. */

const EARTH_RADIUS_M = 6_371_000;

import { locale, t } from "@/i18n";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Fågelvägen mellan två punkter, i meter. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

/**
 * Avstånd som text. Under en kilometer avrundas till närmaste hundra meter:
 * "740 m" låter mer exakt än vad en GPS-position förtjänar.
 */
export function formatDistance(meters: number | null): string {
  if (meters === null) return "";
  if (meters < 100) return t.distance.rightHere;
  if (meters < 1000) return t.distance.metres(Math.round(meters / 100) * 100);
  if (meters < 10_000) {
    const km = (meters / 1000).toFixed(1);
    // Decimalkomma på svenska, punkt på engelska.
    return t.distance.kilometres(locale === "sv" ? km.replace(".", ",") : km);
  }
  return t.distance.kilometres(String(Math.round(meters / 1000)));
}

/**
 * Grovhugger en position till ~1 km rutnät.
 *
 * Används innan hemadressen sparas: appen behöver veta ungefär var du bor för
 * att sortera flödet, men ska aldrig kunna peka ut din port.
 */
export function coarsen({ lat, lng }: LatLng): LatLng {
  const step = 0.01; // ~1,1 km i latitud
  return {
    lat: Math.round(lat / step) * step,
    lng: Math.round(lng / step) * step,
  };
}

/** Länk som öppnar punkten i telefonens kartapp. */
export function mapsUrl({ lat, lng }: LatLng, label?: string): string {
  const query = label ? encodeURIComponent(label) : `${lat},${lng}`;
  return `https://maps.google.com/?q=${query}&ll=${lat},${lng}`;
}
