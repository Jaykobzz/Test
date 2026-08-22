/**
 * Intressekatalogen, speglad från supabase/migrations/*_seed_interests.sql.
 *
 * Ikonnamnen pekar på FRIENDs eget set i components/icons, inte på ett
 * bibliotek och absolut inte på emoji. Varje intresse har en egen ritad ikon.
 */

import type { IconName } from "@/components/icons/Icon";

import type { Interest } from "./types";

export type { IconName };

export const INTERESTS: Interest[] = [
  { slug: "fiske",      label: "Fiske",             icon: "fiske" },
  { slug: "vandring",   label: "Vandring",          icon: "vandring" },
  { slug: "lopning",    label: "Löpning",           icon: "lopning" },
  { slug: "cykling",    label: "Cykling",           icon: "cykling" },
  { slug: "padel",      label: "Padel",             icon: "padel" },
  { slug: "fotboll",    label: "Fotboll",           icon: "fotboll" },
  { slug: "golf",       label: "Golf",              icon: "golf" },
  { slug: "gym",        label: "Gym & träning",     icon: "gym" },
  { slug: "bad",        label: "Bad & kallbad",     icon: "bad" },
  { slug: "paddling",   label: "Paddling & kajak",  icon: "paddling" },
  { slug: "skidor",     label: "Skidor & snö",      icon: "skidor" },
  { slug: "svamp",      label: "Svamp & bär",       icon: "svamp" },
  { slug: "tradgard",   label: "Trädgård & odling", icon: "tradgard" },
  { slug: "matlagning", label: "Matlagning",        icon: "matlagning" },
  { slug: "fika",       label: "Fika",              icon: "fika" },
  { slug: "middag",     label: "Middag & krog",     icon: "middag" },
  { slug: "bradspel",   label: "Brädspel",          icon: "bradspel" },
  { slug: "tvspel",     label: "TV-spel",           icon: "tvspel" },
  { slug: "musik",      label: "Musik & konsert",   icon: "musik" },
  { slug: "film",       label: "Film & bio",        icon: "film" },
  { slug: "bocker",     label: "Böcker",            icon: "bocker" },
  { slug: "foto",       label: "Foto",              icon: "foto" },
  { slug: "konst",      label: "Konst & museum",    icon: "konst" },
  { slug: "bygga",      label: "Bygga & meka",      icon: "bygga" },
  { slug: "motor",      label: "Motor & bil",       icon: "motor" },
  { slug: "hundar",     label: "Hundpromenad",      icon: "hundar" },
  { slug: "foraldrar",  label: "Föräldraliv",       icon: "foraldrar" },
  { slug: "sprak",      label: "Språkutbyte",       icon: "sprak" },
  { slug: "teknik",     label: "Teknik & kod",      icon: "teknik" },
  { slug: "loppis",     label: "Loppis & fynd",     icon: "loppis" },
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
