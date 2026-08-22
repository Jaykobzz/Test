/**
 * Intressekatalogen, speglad från supabase/migrations/*_seed_interests.sql.
 *
 * Den ligger även i koden för att mock-backendet ska fungera utan databas och
 * för att pickern ska kunna rendera direkt vid kallstart. Ändrar du listan
 * här ska samma ändring in i migrationen.
 */

import type { Interest } from "./types";

export const INTERESTS: Interest[] = [
  { slug: "fiske",      label: "Fiske",             emoji: "🎣" },
  { slug: "vandring",   label: "Vandring",          emoji: "🥾" },
  { slug: "lopning",    label: "Löpning",           emoji: "🏃" },
  { slug: "cykling",    label: "Cykling",           emoji: "🚴" },
  { slug: "padel",      label: "Padel",             emoji: "🎾" },
  { slug: "fotboll",    label: "Fotboll",           emoji: "⚽" },
  { slug: "golf",       label: "Golf",              emoji: "⛳" },
  { slug: "gym",        label: "Gym & träning",     emoji: "🏋️" },
  { slug: "bad",        label: "Bad & kallbad",     emoji: "🏊" },
  { slug: "paddling",   label: "Paddling & kajak",  emoji: "🛶" },
  { slug: "skidor",     label: "Skidor & snö",      emoji: "⛷️" },
  { slug: "svamp",      label: "Svamp & bär",       emoji: "🍄" },
  { slug: "tradgard",   label: "Trädgård & odling", emoji: "🌱" },
  { slug: "matlagning", label: "Matlagning",        emoji: "🍳" },
  { slug: "fika",       label: "Fika",              emoji: "☕" },
  { slug: "middag",     label: "Middag & krog",     emoji: "🍽️" },
  { slug: "bradspel",   label: "Brädspel",          emoji: "🎲" },
  { slug: "tvspel",     label: "TV-spel",           emoji: "🎮" },
  { slug: "musik",      label: "Musik & konsert",   emoji: "🎵" },
  { slug: "film",       label: "Film & bio",        emoji: "🎬" },
  { slug: "bocker",     label: "Böcker",            emoji: "📚" },
  { slug: "foto",       label: "Foto",              emoji: "📷" },
  { slug: "konst",      label: "Konst & museum",    emoji: "🎨" },
  { slug: "bygga",      label: "Bygga & meka",      emoji: "🔧" },
  { slug: "motor",      label: "Motor & bil",       emoji: "🚗" },
  { slug: "hundar",     label: "Hundpromenad",      emoji: "🐕" },
  { slug: "foraldrar",  label: "Föräldraliv",       emoji: "👶" },
  { slug: "sprak",      label: "Språkutbyte",       emoji: "🗣️" },
  { slug: "teknik",     label: "Teknik & kod",      emoji: "💻" },
  { slug: "loppis",     label: "Loppis & fynd",     emoji: "🛍️" },
];

const BY_SLUG = new Map(INTERESTS.map((i) => [i.slug, i]));

export function interestBySlug(slug: string | null | undefined): Interest | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

/** "🎣 Fiske", eller tom sträng om kategorin är okänd. */
export function interestLabel(slug: string | null | undefined): string {
  const interest = interestBySlug(slug);
  return interest ? `${interest.emoji} ${interest.label}` : "";
}
