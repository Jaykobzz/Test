/** Svenska datum- och tidsformat. */

const DAYS = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
const MONTHS = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function clock(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
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

  if (sameDay(start, now)) return `Idag ${span}`;
  if (sameDay(start, tomorrow)) return `Imorgon ${span}`;

  const withinWeek = start.getTime() - now.getTime() < 7 * 86_400_000;
  if (withinWeek && start > now) return `${capitalize(DAYS[start.getDay()]!)} ${span}`;

  return `${formatDay(start)} ${span}`;
}

/** "3 juni", eller "3 juni 2027" om det är ett annat år. */
export function formatDay(d: Date): string {
  const now = new Date();
  const year = d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year}`;
}

/** Relativ tid för chattlistan: "nyss", "12 min", "3 tim", "igår", "3 juni". */
export function formatRelative(iso: string): string {
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "nyss";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24 && sameDay(then, new Date())) return `${hours} tim`;

  const yesterday = new Date(Date.now() - 86_400_000);
  if (sameDay(then, yesterday)) return "igår";

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
  if (sameDay(d, now)) return "Idag";
  if (sameDay(d, new Date(Date.now() - 86_400_000))) return "Igår";
  return capitalize(`${DAYS[d.getDay()]} ${formatDay(d)}`);
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
