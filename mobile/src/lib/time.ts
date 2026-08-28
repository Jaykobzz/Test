/**
 * Datum och tid, på appens språk.
 *
 * Veckodagar och månader kommer från Intl och inte från listor jag skriver
 * själv. Två skäl: webbläsaren och telefonen kan redan alla språk, och en
 * handskriven lista blir fel så fort någon lägger till ett tredje språk och
 * glömmer den här filen.
 */

import { locale, t } from "@/i18n";

const TAG = locale === "sv" ? "sv-SE" : "en-GB";

const dayName = new Intl.DateTimeFormat(TAG, { weekday: "long" });
const dayMonth = new Intl.DateTimeFormat(TAG, { day: "numeric", month: "long" });
const dayMonthYear = new Intl.DateTimeFormat(TAG, {
  day: "numeric", month: "long", year: "numeric",
});

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * Punkt mellan timme och minut på svenska, kolon på engelska. Det är den
 * svenska skrivregeln, och den engelska förväntningen.
 */
function clock(d: Date): string {
  const sep = locale === "sv" ? "." : ":";
  return `${String(d.getHours()).padStart(2, "0")}${sep}`
    + `${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "Idag 13.00–15.00", "Imorgon 08.30–09.30", "tisdag 3 juni 13.00–15.00" */
export function formatActivityWhen(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86_400_000);

  const span = sameDay(start, end)
    ? `${clock(start)}–${clock(end)}`
    : `${clock(start)} – ${formatDay(end)} ${clock(end)}`;

  if (sameDay(start, now)) return `${t.when.today} ${span}`;
  if (sameDay(start, tomorrow)) return `${t.when.tomorrow} ${span}`;

  const withinWeek = start.getTime() - now.getTime() < 7 * 86_400_000;
  if (withinWeek && start > now) return `${capitalize(dayName.format(start))} ${span}`;

  return `${formatDay(start)} ${span}`;
}

/** "3 juni", eller "3 juni 2027" om det är ett annat år. */
export function formatDay(d: Date): string {
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return (sameYear ? dayMonth : dayMonthYear).format(d);
}

/** Relativ tid för chattlistan: "nyss", "12 min", "3 tim", "igår", "3 juni". */
export function formatRelative(iso: string): string {
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return t.when.justNow;
  if (minutes < 60) return t.when.minutes(minutes);

  const hours = Math.floor(minutes / 60);
  if (hours < 24 && sameDay(then, new Date())) return t.when.hours(hours);

  const yesterday = new Date(Date.now() - 86_400_000);
  if (sameDay(then, yesterday)) return t.when.yesterday;

  return formatDay(then);
}

/** Klockslag i chattbubblor. */
export function formatTime(iso: string): string {
  return clock(new Date(iso));
}

/** Datumavdelare i chatten. */
export function formatChatDivider(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return t.when.todayCapital;
  if (sameDay(d, new Date(Date.now() - 86_400_000))) return t.when.yesterdayCapital;
  return capitalize(`${dayName.format(d)} ${formatDay(d)}`);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Lokal ISO-sträng utan tidszonsförskjutning, för datumväljare. */
export function toIso(date: Date): string {
  return date.toISOString();
}

/** Lägger till timmar på ett datum utan att mutera originalet. */
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}
