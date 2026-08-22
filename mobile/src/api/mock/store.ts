/**
 * Lokalt datalager för mock-backendet.
 *
 * Allt ligger i minnet och speglas till AsyncStorage, så appen kommer ihåg vad
 * du gjort mellan omstarter. Formen efterliknar tabellerna i Postgres med
 * flit — då blir Supabase-implementationen en översättning och inte en
 * omskrivning.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  ActivityStatus,
  ActivityVisibility,
  FriendshipStatus,
  JoinStatus,
  ListItem,
  MessageKind,
  Uuid,
} from "../types";
import { DEFAULT_LOCATION, SEED_ACTIVITIES, SEED_PROFILES } from "./seed";

const STORAGE_KEY = "friend.mock.db.v1";

export interface MockProfile {
  id: Uuid;
  displayName: string;
  bio: string | null;
  avatarUrl: string;
  interests: string[];
  homeLat: number | null;
  homeLng: number | null;
  homeAreaLabel: string | null;
  birthYear: number;
  createdAt: string;
}

export interface MockActivity {
  id: Uuid;
  hostId: Uuid;
  title: string;
  description: string | null;
  category: string | null;
  coverUrl: string;
  locationName: string;
  lat: number;
  lng: number;
  startsAt: string;
  endsAt: string;
  visibility: ActivityVisibility;
  capacity: number | null;
  minAge: number | null;
  status: ActivityStatus;
  createdAt: string;
}

export interface MockParticipant {
  id: Uuid;
  activityId: Uuid;
  userId: Uuid;
  status: JoinStatus;
  introMessage: string | null;
  createdAt: string;
}

export interface MockThread {
  id: Uuid;
  kind: "activity" | "direct";
  activityId: Uuid | null;
  title: string | null;
  lastMessageAt: string;
}

export interface MockThreadMember {
  threadId: Uuid;
  userId: Uuid;
  lastReadAt: string;
}

export interface MockMessage {
  id: Uuid;
  threadId: Uuid;
  senderId: Uuid | null;
  kind: MessageKind;
  body: string | null;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
  items: ListItem[] | null;
  createdAt: string;
}

export interface MockFriendship {
  id: Uuid;
  requesterId: Uuid;
  addresseeId: Uuid;
  status: FriendshipStatus;
  createdAt: string;
}

export interface MockDb {
  /** Inloggad användare, eller null. */
  currentUserId: Uuid | null;
  profiles: MockProfile[];
  activities: MockActivity[];
  participants: MockParticipant[];
  threads: MockThread[];
  threadMembers: MockThreadMember[];
  messages: MockMessage[];
  friendships: MockFriendship[];
  blocks: { blockerId: Uuid; blockedId: Uuid }[];
  reports: { id: Uuid; reporterId: Uuid; reportedUserId: Uuid; reason: string;
             details: string | null; createdAt: string }[];
  /** Personnummer -> profil. Motsvarar personal_number_hash i Postgres. */
  identities: Record<string, Uuid>;
}

export function newId(): Uuid {
  // Räcker gott för lokal mock; riktiga id:n kommer från Postgres.
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  const block = (n: number) => Array.from({ length: n }, hex).join("");
  return `${block(8)}-${block(4)}-4${block(3)}-8${block(3)}-${block(12)}`;
}

function buildSeed(): MockDb {
  const now = Date.now();

  const profiles: MockProfile[] = SEED_PROFILES.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    interests: p.interests,
    homeLat: DEFAULT_LOCATION.lat,
    homeLng: DEFAULT_LOCATION.lng,
    homeAreaLabel: p.homeAreaLabel,
    birthYear: p.birthYear,
    createdAt: new Date(now - p.memberForDays * 86_400_000).toISOString(),
  }));

  const activities: MockActivity[] = SEED_ACTIVITIES.map((a) => {
    const startsAt = new Date(now + a.startsInHours * 3_600_000);
    const endsAt = new Date(startsAt.getTime() + a.durationHours * 3_600_000);
    return {
      id: a.id,
      hostId: a.hostId,
      title: a.title,
      description: a.description,
      category: a.category,
      coverUrl: a.coverUrl,
      locationName: a.locationName,
      lat: a.lat,
      lng: a.lng,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      visibility: a.visibility,
      capacity: a.capacity,
      minAge: null,
      status: endsAt.getTime() < now ? "completed" : "open",
      createdAt: new Date(now - 3 * 86_400_000).toISOString(),
    };
  });

  // Seedprofilerna har hakat på varandras aktiviteter, så att deltagarlistor
  // och kapacitet inte är tomma innan du själv gjort något.
  const participants: MockParticipant[] = [
    { activityId: activities[0]!.id, userId: profiles[1]!.id, status: "accepted" },
    { activityId: activities[0]!.id, userId: profiles[6]!.id, status: "pending" },
    { activityId: activities[1]!.id, userId: profiles[6]!.id, status: "accepted" },
    { activityId: activities[2]!.id, userId: profiles[4]!.id, status: "accepted" },
    { activityId: activities[4]!.id, userId: profiles[2]!.id, status: "accepted" },
    { activityId: activities[4]!.id, userId: profiles[3]!.id, status: "accepted" },
    { activityId: activities[5]!.id, userId: profiles[7]!.id, status: "accepted" },
  ].map((p, i) => ({
    id: `33333333-3333-4333-8333-3333333333${String(i).padStart(2, "0")}`,
    activityId: p.activityId,
    userId: p.userId,
    status: p.status as JoinStatus,
    introMessage: null,
    createdAt: new Date(now - 2 * 86_400_000).toISOString(),
  }));

  // Micke och Sara är redan BFF med varandra — visar hur BFF-flödet ser ut.
  const friendships: MockFriendship[] = [
    {
      id: "44444444-4444-4444-8444-444444444401",
      requesterId: profiles[0]!.id,
      addresseeId: profiles[1]!.id,
      status: "accepted",
      createdAt: new Date(now - 30 * 86_400_000).toISOString(),
    },
  ];

  return {
    currentUserId: null,
    profiles,
    activities,
    participants,
    threads: [],
    threadMembers: [],
    messages: [],
    friendships,
    blocks: [],
    reports: [],
    identities: {},
  };
}

let db: MockDb | null = null;
let writeQueue: Promise<void> = Promise.resolve();

export async function loadDb(): Promise<MockDb> {
  if (db) return db;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      db = JSON.parse(raw) as MockDb;
      return db;
    }
  } catch {
    // Trasigt lagringsinnehåll ska inte låsa appen — bygg om från seed.
  }

  db = buildSeed();
  await persist();
  return db;
}

/**
 * Skrivningar köas i stället för att köras parallellt. Två samtidiga
 * setItem-anrop kan annars landa i omvänd ordning och skriva över nyare data.
 */
export function persist(): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    if (!db) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Full disk eller liknande. Minnesläget är fortfarande korrekt.
    }
  });
  return writeQueue;
}

/** Kastar allt lokalt och börjar om från seed. Används av "Börja om" i profilen. */
export async function resetDb(): Promise<void> {
  db = buildSeed();
  await persist();
}

export function requireDb(): MockDb {
  if (!db) throw new Error("Mock-databasen är inte laddad än");
  return db;
}
