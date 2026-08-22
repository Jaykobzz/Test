/** Position och områdesnamn. */

import * as Location from "expo-location";

import { coarsen, type LatLng } from "./geo";
import { DEFAULT_LOCATION } from "@/api/mock/seed";

export interface PlaceGuess extends LatLng {
  label: string;
  /** Falskt när användaren nekat och vi föll tillbaka på en förvald punkt. */
  precise: boolean;
}

/**
 * Nuvarande position med områdesnamn.
 *
 * Nekad behörighet är inget fel, appen ska funka ändå, bara med en förvald
 * utgångspunkt som användaren kan ändra.
 */
export async function getCurrentPlace(): Promise<PlaceGuess> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== Location.PermissionStatus.GRANTED) {
    return { ...DEFAULT_LOCATION, label: DEFAULT_LOCATION.label, precise: false };
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const point: LatLng = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };

  return { ...point, label: await describePlace(point), precise: true };
}

/** Områdesnamn för en punkt, t.ex. "Skarpnäck". */
export async function describePlace(point: LatLng): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: point.lat,
      longitude: point.lng,
    });
    if (!place) return "Okänt område";
    return place.district ?? place.subregion ?? place.city ?? place.region ?? "Okänt område";
  } catch {
    // Omvänd geokodning kräver nät och kan tystna. Positionen duger ändå.
    return "Okänt område";
  }
}

/**
 * Hemposition att spara på profilen, alltid grovhuggen till ~1 km rutnät.
 * Appen ska veta ungefär var du bor, aldrig exakt.
 */
export async function getHomePlace(): Promise<PlaceGuess> {
  const place = await getCurrentPlace();
  const coarse = coarsen(place);
  return { ...coarse, label: place.label, precise: place.precise };
}
