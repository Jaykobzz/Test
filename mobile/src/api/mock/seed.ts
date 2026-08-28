/**
 * Utgångsläge för mock-backendet.
 *
 * Aktiviteterna ligger runt södra Stockholm, med Drevviken som mittpunkt:
 * samma trakt som exemplet appen ritades kring. Tiderna är relativa till när
 * du startar appen, så flödet är aldrig tomt och aldrig gammalt.
 */

import { Image } from "react-native";

import type { ActivityVisibility, Uuid } from "../types";

export interface SeedProfile {
  id: Uuid;
  displayName: string;
  bio: string;
  avatarUrl: string;
  interests: string[];
  homeAreaLabel: string;
  birthYear: number;
  /** Hur länge personen varit med, i dagar bakåt från nu. */
  memberForDays: number;
}

export interface SeedActivity {
  id: Uuid;
  hostId: Uuid;
  title: string;
  description: string;
  category: string;
  coverUrl: string;
  locationName: string;
  lat: number;
  lng: number;
  /** Timmar från nu till start. Negativt = redan varit. */
  startsInHours: number;
  durationHours: number;
  visibility: ActivityVisibility;
  capacity: number | null;
  /** Kostnad per person i hela kronor. Utelämnad = gratis. */
  priceSek?: number;
}

/**
 * Bilderna ligger i bundlen, inte på nätet.
 *
 * resolveAssetSource ger en URI som fungerar både i utveckling, där Metro
 * serverar filen, och i ett byggt paket. Typerna kan därmed vara string hela
 * vägen, och appen fungerar utan nät.
 */
const asset = (mod: number): string => Image.resolveAssetSource(mod).uri;

const COVER = {
  fiske: asset(require("../../../assets/seed/cover-fiske.jpg")),
  lopning: asset(require("../../../assets/seed/cover-lopning.jpg")),
  padel: asset(require("../../../assets/seed/cover-padel.jpg")),
  matlagning: asset(require("../../../assets/seed/cover-matlagning.jpg")),
  bradspel: asset(require("../../../assets/seed/cover-bradspel.jpg")),
  hundar: asset(require("../../../assets/seed/cover-hundar.jpg")),
  kallbad: asset(require("../../../assets/seed/cover-kallbad.jpg")),
  foraldrar: asset(require("../../../assets/seed/cover-foraldrar.jpg")),
  svamp: asset(require("../../../assets/seed/cover-svamp.jpg")),
  gardet: asset(require("../../../assets/seed/cover-gardet.jpg")),
  skateboard: asset(require("../../../assets/seed/cover-skateboard.jpg")),
} as const;

const PORTRAIT = {
  amir: asset(require("../../../assets/seed/avatar-amir.jpg")),
  anders: asset(require("../../../assets/seed/avatar-anders.jpg")),
  elin: asset(require("../../../assets/seed/avatar-elin.jpg")),
  ida: asset(require("../../../assets/seed/avatar-ida.jpg")),
  johan: asset(require("../../../assets/seed/avatar-johan.jpg")),
  klara: asset(require("../../../assets/seed/avatar-klara.jpg")),
  micke: asset(require("../../../assets/seed/avatar-micke.jpg")),
  nils: asset(require("../../../assets/seed/avatar-nils.jpg")),
  sara: asset(require("../../../assets/seed/avatar-sara.jpg")),
  thu: asset(require("../../../assets/seed/avatar-thu.jpg")),
} as const;

export const SEED_PROFILES: SeedProfile[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    displayName: "Micke",
    bio: "Fiskar helst i gryningen. Har extra spö om du vill testa.",
    avatarUrl: PORTRAIT.micke,
    interests: ["fiske", "paddling", "svamp"],
    homeAreaLabel: "Skarpnäck",
    birthYear: 1984,
    memberForDays: 420,
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    displayName: "Sara",
    bio: "Springer långsamt men pratar fort. Söker löparsällskap på vardagsmorgnar.",
    avatarUrl: PORTRAIT.sara,
    interests: ["lopning", "fika", "bocker"],
    homeAreaLabel: "Bagarmossen",
    birthYear: 1991,
    memberForDays: 610,
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    displayName: "Johan",
    bio: "Padel tre gånger i veckan. Nybörjare välkomna, jag är också dålig.",
    avatarUrl: PORTRAIT.johan,
    interests: ["padel", "gym", "tvspel"],
    homeAreaLabel: "Farsta",
    birthYear: 1988,
    memberForDays: 300,
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    displayName: "Elin",
    bio: "Nyinflyttad från Göteborg. Vill hitta folk att laga mat med.",
    avatarUrl: PORTRAIT.elin,
    interests: ["matlagning", "konst", "loppis"],
    homeAreaLabel: "Hökarängen",
    birthYear: 1995,
    memberForDays: 95,
  },
  {
    id: "11111111-1111-4111-8111-111111111105",
    displayName: "Anders",
    bio: "Brädspel varje torsdag. Har över hundra spel i källaren.",
    avatarUrl: PORTRAIT.anders,
    interests: ["bradspel", "film", "bygga"],
    homeAreaLabel: "Enskede",
    birthYear: 1979,
    memberForDays: 880,
  },
  {
    id: "11111111-1111-4111-8111-111111111106",
    displayName: "Klara",
    bio: "Hund som heter Bosse. Går milsvida promenader oavsett väder.",
    avatarUrl: PORTRAIT.klara,
    interests: ["hundar", "vandring", "foto"],
    homeAreaLabel: "Älvsjö",
    birthYear: 1993,
    memberForDays: 240,
  },
  {
    id: "11111111-1111-4111-8111-111111111107",
    displayName: "Nils",
    bio: "Kallbadar året runt. Det är inte så farligt som det låter.",
    avatarUrl: PORTRAIT.nils,
    interests: ["bad", "lopning", "teknik"],
    homeAreaLabel: "Tyresö",
    birthYear: 1986,
    memberForDays: 505,
  },
  {
    id: "11111111-1111-4111-8111-111111111108",
    displayName: "Ida",
    bio: "Föräldraledig med Vega, 8 mån. Söker sällskap på dagpromenader.",
    avatarUrl: PORTRAIT.ida,
    interests: ["foraldrar", "fika", "tradgard"],
    homeAreaLabel: "Gubbängen",
    birthYear: 1992,
    memberForDays: 60,
  },
  {
    id: "11111111-1111-4111-8111-111111111109",
    displayName: "Amir",
    bio: "Uppvuxen i Farsta. Spelar fotboll på grus när ingen annan orkar.",
    avatarUrl: PORTRAIT.amir,
    interests: ["fotboll", "skateboard", "middag"],
    homeAreaLabel: "Farsta",
    birthYear: 1990,
    memberForDays: 150,
  },
  {
    id: "11111111-1111-4111-8111-111111111110",
    displayName: "Thu",
    bio: "Flyttade hit förra året. Vill prata svenska med någon som inte har bråttom.",
    avatarUrl: PORTRAIT.thu,
    interests: ["sprak", "cykling", "foto"],
    homeAreaLabel: "Årsta",
    birthYear: 1997,
    memberForDays: 40,
  },
];

export const SEED_ACTIVITIES: SeedActivity[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    hostId: SEED_PROFILES[0]!.id,
    title: "Fiska i Drevviken",
    description:
      "Tar med extra spö och kaffe. Vi står vid bryggan nedanför Skarpnäcksfältet. "
      + "Ingen erfarenhet behövs, jag visar hur man kastar.",
    category: "fiske",
    coverUrl: COVER.fiske,
    locationName: "Drevviken, Skarpnäck",
    lat: 59.2617,
    lng: 18.1204,
    startsInHours: 20,
    durationHours: 2,
    visibility: "public",
    capacity: 4,
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    hostId: SEED_PROFILES[1]!.id,
    title: "Lugn morgonrunda 5 km",
    description: "Runt Bagarmossen. Vi springer i pratfart, ingen hets.",
    category: "lopning",
    coverUrl: COVER.lopning,
    locationName: "Bagarmossens centrum",
    lat: 59.2735,
    lng: 18.1305,
    startsInHours: 14,
    durationHours: 1,
    visibility: "public",
    capacity: 6,
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    hostId: SEED_PROFILES[2]!.id,
    title: "Padel, vi saknar två",
    description: "Bokad bana. Nybörjarvänligt, vi kör mest för att det är kul.",
    category: "padel",
    coverUrl: COVER.padel,
    locationName: "Farsta Padelcenter",
    lat: 59.2427,
    lng: 18.0906,
    startsInHours: 30,
    durationHours: 2,
    visibility: "public",
    capacity: 2,
  },
  {
    id: "22222222-2222-4222-8222-222222222204",
    hostId: SEED_PROFILES[3]!.id,
    title: "Vi lagar för mycket mat",
    description:
      "Jag har fått en enorm låda grönsaker och tänkte laga soppa på allt. "
      + "Ta med en burk att fylla.",
    category: "matlagning",
    coverUrl: COVER.matlagning,
    locationName: "Hökarängen",
    lat: 59.2569,
    lng: 18.0817,
    startsInHours: 52,
    durationHours: 3,
    visibility: "public",
    capacity: 5,
  },
  {
    id: "22222222-2222-4222-8222-222222222205",
    hostId: SEED_PROFILES[4]!.id,
    title: "Brädspelskväll",
    description: "Torsdagsklassikern. Vi börjar med något lätt och ser var det slutar.",
    category: "bradspel",
    coverUrl: COVER.bradspel,
    locationName: "Enskede gård",
    lat: 59.2836,
    lng: 18.0679,
    startsInHours: 74,
    durationHours: 4,
    visibility: "public",
    capacity: 6,
  },
  {
    id: "22222222-2222-4222-8222-222222222206",
    hostId: SEED_PROFILES[5]!.id,
    title: "Hundpromenad i Årstaskogen",
    description: "Bosse behöver springa av sig. Alla hundar välkomna, även inga hundar.",
    category: "hundar",
    coverUrl: COVER.hundar,
    locationName: "Årstaskogen",
    lat: 59.2989,
    lng: 18.0491,
    startsInHours: 26,
    durationHours: 2,
    visibility: "public",
    capacity: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222207",
    hostId: SEED_PROFILES[6]!.id,
    title: "Kallbad + bastu",
    description: "Sex grader i vattnet. Bastun är varm efteråt, jag lovar.",
    category: "bad",
    coverUrl: COVER.kallbad,
    priceSek: 120,
    locationName: "Tyresö strandbad",
    lat: 59.2402,
    lng: 18.2295,
    startsInHours: 44,
    durationHours: 2,
    visibility: "public",
    capacity: 8,
  },
  {
    id: "22222222-2222-4222-8222-222222222208",
    hostId: SEED_PROFILES[7]!.id,
    title: "Barnvagnspromenad och fika",
    description: "Lugnt tempo, långt kaffe. Vi går runt Gubbängsfältet.",
    category: "foraldrar",
    coverUrl: COVER.foraldrar,
    locationName: "Gubbängsfältet",
    lat: 59.2637,
    lng: 18.0834,
    startsInHours: 18,
    durationHours: 2,
    visibility: "public",
    capacity: 5,
  },
  {
    id: "22222222-2222-4222-8222-222222222209",
    hostId: SEED_PROFILES[0]!.id,
    title: "Svampskogen, bara för kompisar",
    description: "Jag visar mitt kantarellställe. Därför inte offentligt.",
    category: "svamp",
    coverUrl: COVER.svamp,
    locationName: "Nackareservatet",
    lat: 59.2903,
    lng: 18.1571,
    startsInHours: 98,
    durationHours: 4,
    visibility: "friends",
    capacity: 3,
  },
  {
    id: "22222222-2222-4222-8222-222222222210",
    hostId: SEED_PROFILES[1]!.id,
    title: "Löprunda som redan varit",
    description: "Den här ligger bakåt i tiden så att du kan testa betygsflödet.",
    category: "lopning",
    coverUrl: COVER.gardet,
    locationName: "Nytorps gärde",
    lat: 59.2701,
    lng: 18.1148,
    startsInHours: -30,
    durationHours: 1,
    visibility: "public",
    capacity: 6,
  },
];

/** Startposition när platsbehörighet saknas: Drevvikens norra strand. */
export const DEFAULT_LOCATION = { lat: 59.2617, lng: 18.1204, label: "Skarpnäck" };