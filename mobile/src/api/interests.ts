/**
 * Intressekatalogen, speglad från supabase/migrations/*_seed_interests.sql.
 *
 * Ikonerna är linjeikoner ur ett enda set, inte emoji. Emoji ser olika ut på
 * varje plattform, går inte att färgsätta, bryter mot typografins rytm och
 * signalerar snabbhopkommen app. En chip med bra typografi och ett tunt
 * streckat glyf ser ut som något någon har ritat.
 */

import type { Ionicons } from "@expo/vector-icons";

import type { Interest } from "./types";

export type IconName = keyof typeof Ionicons.glyphMap;

export const INTERESTS: Interest[] = [
  { slug: "fiske",      label: "Fiske",             icon: "fish-outline" },
  { slug: "vandring",   label: "Vandring",          icon: "trail-sign-outline" },
  { slug: "lopning",    label: "Löpning",           icon: "walk-outline" },
  { slug: "cykling",    label: "Cykling",           icon: "bicycle-outline" },
  { slug: "padel",      label: "Padel",             icon: "tennisball-outline" },
  { slug: "fotboll",    label: "Fotboll",           icon: "football-outline" },
  { slug: "golf",       label: "Golf",              icon: "golf-outline" },
  { slug: "gym",        label: "Gym & träning",     icon: "barbell-outline" },
  { slug: "bad",        label: "Bad & kallbad",     icon: "water-outline" },
  { slug: "paddling",   label: "Paddling & kajak",  icon: "boat-outline" },
  { slug: "skidor",     label: "Skidor & snö",      icon: "snow-outline" },
  { slug: "svamp",      label: "Svamp & bär",       icon: "leaf-outline" },
  { slug: "tradgard",   label: "Trädgård & odling", icon: "flower-outline" },
  { slug: "matlagning", label: "Matlagning",        icon: "restaurant-outline" },
  { slug: "fika",       label: "Fika",              icon: "cafe-outline" },
  { slug: "middag",     label: "Middag & krog",     icon: "wine-outline" },
  { slug: "bradspel",   label: "Brädspel",          icon: "dice-outline" },
  { slug: "tvspel",     label: "TV-spel",           icon: "game-controller-outline" },
  { slug: "musik",      label: "Musik & konsert",   icon: "musical-notes-outline" },
  { slug: "film",       label: "Film & bio",        icon: "film-outline" },
  { slug: "bocker",     label: "Böcker",            icon: "book-outline" },
  { slug: "foto",       label: "Foto",              icon: "camera-outline" },
  { slug: "konst",      label: "Konst & museum",    icon: "color-palette-outline" },
  { slug: "bygga",      label: "Bygga & meka",      icon: "hammer-outline" },
  { slug: "motor",      label: "Motor & bil",       icon: "car-sport-outline" },
  { slug: "hundar",     label: "Hundpromenad",      icon: "paw-outline" },
  { slug: "foraldrar",  label: "Föräldraliv",       icon: "people-outline" },
  { slug: "sprak",      label: "Språkutbyte",       icon: "chatbubbles-outline" },
  { slug: "teknik",     label: "Teknik & kod",      icon: "code-slash-outline" },
  { slug: "loppis",     label: "Loppis & fynd",     icon: "pricetag-outline" },
];

const BY_SLUG = new Map(INTERESTS.map((i) => [i.slug, i]));

export function interestBySlug(slug: string | null | undefined): Interest | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

/** Bara etiketten. Ikonen renderas separat, aldrig som ett tecken i texten. */
export function interestLabel(slug: string | null | undefined): string {
  return interestBySlug(slug)?.label ?? "";
}

export function interestIcon(slug: string | null | undefined): IconName | undefined {
  return interestBySlug(slug)?.icon as IconName | undefined;
}
