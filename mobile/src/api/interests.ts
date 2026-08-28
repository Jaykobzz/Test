/**
 * Intressekatalogen, speglad från supabase/migrations/*_seed_interests.sql.
 *
 * Slugen är nyckeln, både här och i databasen, och byter aldrig språk.
 * Etiketten kommer ur ordboken, så listan ser likadan ut på svenska och
 * engelska medan den data som sparas är densamma.
 *
 * Ikonnamnen pekar på appens eget set i components/icons, inte på ett
 * bibliotek och absolut inte på emoji. Varje intresse har en egen ritad ikon.
 */

import type { IconName } from "@/components/icons/Icon";

import { t } from "@/i18n";

import type { Interest } from "./types";

export type { IconName };

export const INTERESTS: Interest[] = [
  { slug: "fiske",      label: t.interests.fiske,             icon: "fiske" },
  { slug: "vandring",   label: t.interests.vandring,          icon: "vandring" },
  { slug: "lopning",    label: t.interests.lopning,           icon: "lopning" },
  { slug: "cykling",    label: t.interests.cykling,           icon: "cykling" },
  { slug: "skateboard", label: t.interests.skateboard,        icon: "skateboard" },
  { slug: "padel",      label: t.interests.padel,             icon: "padel" },
  { slug: "fotboll",    label: t.interests.fotboll,           icon: "fotboll" },
  { slug: "golf",       label: t.interests.golf,              icon: "golf" },
  { slug: "gym",        label: t.interests.gym,     icon: "gym" },
  { slug: "bad",        label: t.interests.bad,     icon: "bad" },
  { slug: "paddling",   label: t.interests.paddling,  icon: "paddling" },
  { slug: "skidor",     label: t.interests.skidor,      icon: "skidor" },
  { slug: "svamp",      label: t.interests.svamp,       icon: "svamp" },
  { slug: "tradgard",   label: t.interests.tradgard, icon: "tradgard" },
  { slug: "handarbete", label: t.interests.handarbete,        icon: "handarbete" },
  { slug: "matlagning", label: t.interests.matlagning,        icon: "matlagning" },
  { slug: "fika",       label: t.interests.fika,              icon: "fika" },
  { slug: "middag",     label: t.interests.middag,     icon: "middag" },
  { slug: "bradspel",   label: t.interests.bradspel,          icon: "bradspel" },
  { slug: "tvspel",     label: t.interests.tvspel,           icon: "tvspel" },
  { slug: "musik",      label: t.interests.musik,   icon: "musik" },
  { slug: "film",       label: t.interests.film,        icon: "film" },
  { slug: "bocker",     label: t.interests.bocker,            icon: "bocker" },
  { slug: "foto",       label: t.interests.foto,              icon: "foto" },
  { slug: "konst",      label: t.interests.konst,    icon: "konst" },
  { slug: "bygga",      label: t.interests.bygga,      icon: "bygga" },
  { slug: "motor",      label: t.interests.motor,       icon: "motor" },
  { slug: "hundar",     label: t.interests.hundar,      icon: "hundar" },
  { slug: "foraldrar",  label: t.interests.foraldrar,       icon: "foraldrar" },
  { slug: "sprak",      label: t.interests.sprak,       icon: "sprak" },
  { slug: "teknik",     label: t.interests.teknik,      icon: "teknik" },
  { slug: "loppis",     label: t.interests.loppis,     icon: "loppis" },
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
