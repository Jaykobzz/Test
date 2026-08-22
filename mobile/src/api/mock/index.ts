/**
 * Mock-backend — hela FRIEND utan server.
 *
 * Syftet är att man ska kunna köra `npx expo start` och klicka igenom flödet
 * på riktigt: logga in, skapa aktivitet, ansöka, acceptera, chatta, betygsätta,
 * bli BFF. Ingen Supabase, ingen inloggning mot något externt.
 *
 * Reglerna nedan speglar RLS-policyerna och RPC-kontrollerna i databasen. Om
 * du ändrar en regel här ska motsvarande ändring göras i migrationerna, annars
 * beter sig appen olika beroende på vilket backend som är inkopplat.
 */

import type { Backend } from "../backend";
import type {
  ActivityCard,
  ActivityDetail,
  Applicant,
  BankIdCollect,
  BankIdStart,
  BffRequest,
  CreateActivityInput,
  DiscoverParams,
  FriendshipStatus,
  ImageBucket,
  Interest,
  ListItem,
  Message,
  MyProfile,
  PublicProfile,
  Rematch,
  RematchPrompt,
  SendMessageInput,
  ThreadSummary,
  Uuid,
} from "../types";
import { INTERESTS } from "../interests";
import { distanceMeters } from "@/lib/geo";
import {
  loadDb,
  newId,
  persist,
  resetDb,
  type MockActivity,
  type MockDb,
  type MockParticipant,
} from "./store";

const SIGNING_DURATION_MS = 3_000;
/** Hur länge efter en aktivitet man kan svara på om man vill göra om det. */
const WINDOW_MS = 14 * 86_400_000;
const FIRST_NAMES = ["Anna", "Erik", "Maria", "Johan", "Sara", "Karl", "Elin", "Anders"];

/** Trådlyssnare, så att chatten uppdateras när man skickar något. */
const threadListeners = new Map<Uuid, Set<(m: Message) => void>>();

function nowIso(): string {
  return new Date().toISOString();
}

function normalizePnr(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 12) return digits;
  if (digits.length === 10) {
    const yy = Number(digits.slice(0, 2));
    const nowYY = new Date().getFullYear() % 100;
    return (yy > nowYY ? "19" : "20") + digits;
  }
  throw new Error("Personnumret ska ha 10 eller 12 siffror");
}

function meOrThrow(db: MockDb): Uuid {
  if (!db.currentUserId) throw new Error("Inte inloggad");
  return db.currentUserId;
}

function profileOrThrow(db: MockDb, id: Uuid) {
  const profile = db.profiles.find((p) => p.id === id);
  if (!profile) throw new Error("Profilen finns inte");
  return profile;
}

function activityOrThrow(db: MockDb, id: Uuid): MockActivity {
  const activity = db.activities.find((a) => a.id === id);
  if (!activity) throw new Error("Aktiviteten finns inte");
  return activity;
}

function areBffs(db: MockDb, a: Uuid, b: Uuid): boolean {
  return db.friendships.some(
    (f) =>
      f.status === "accepted" &&
      ((f.requesterId === a && f.addresseeId === b) ||
        (f.requesterId === b && f.addresseeId === a)),
  );
}

function isBlocked(db: MockDb, a: Uuid, b: Uuid): boolean {
  return db.blocks.some(
    (x) =>
      (x.blockerId === a && x.blockedId === b) ||
      (x.blockerId === b && x.blockedId === a),
  );
}

function acceptedCount(db: MockDb, activityId: Uuid): number {
  return db.participants.filter(
    (p) => p.activityId === activityId && p.status === "accepted",
  ).length;
}

/** Genomförda aktiviteter personen varit med på — värd eller deltagare. */
function completedActivityCount(db: MockDb, userId: Uuid): number {
  return db.activities.filter(
    (a) =>
      a.status === "completed" &&
      (a.hostId === userId ||
        db.participants.some(
          (p) => p.activityId === a.id && p.userId === userId && p.status === "accepted",
        )),
  ).length;
}

function friendshipBetween(db: MockDb, a: Uuid, b: Uuid) {
  return db.friendships.find(
    (f) =>
      (f.requesterId === a && f.addresseeId === b) ||
      (f.requesterId === b && f.addresseeId === a),
  );
}

function toPublicProfile(db: MockDb, userId: Uuid): PublicProfile {
  const p = profileOrThrow(db, userId);
  const me = db.currentUserId;
  const friendship = me ? friendshipBetween(db, me, userId) : undefined;

  let bffStatus: FriendshipStatus | "none" = "none";
  if (friendship) bffStatus = friendship.status;

  return {
    id: p.id,
    displayName: p.displayName,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    interests: p.interests,
    homeAreaLabel: p.homeAreaLabel,
    approxAge: new Date().getFullYear() - p.birthYear,
    bankIdVerified: true,
    memberSince: p.createdAt,
    activitiesHosted: db.activities.filter(
      (a) => a.hostId === userId && a.status === "completed",
    ).length,
    activitiesJoined: db.participants.filter(
      (x) => x.userId === userId && x.status === "accepted",
    ).length,
    bffCount: db.friendships.filter(
      (f) =>
        f.status === "accepted" && (f.requesterId === userId || f.addresseeId === userId),
    ).length,
    bffStatus,
    bffRequestId: friendship?.id ?? null,
    bffAwaitingMyAnswer:
      !!friendship && friendship.status === "pending" && friendship.addresseeId === me,
  };
}

function toActivityCard(
  db: MockDb,
  activity: MockActivity,
  origin?: { lat: number; lng: number },
): ActivityCard {
  const me = db.currentUserId;
  const host = profileOrThrow(db, activity.hostId);
  const accepted = acceptedCount(db, activity.id);
  const mine = me
    ? db.participants.find((p) => p.activityId === activity.id && p.userId === me)
    : undefined;

  return {
    id: activity.id,
    hostId: activity.hostId,
    hostName: host.displayName,
    hostAvatar: host.avatarUrl,
    hostActivityCount: completedActivityCount(db, activity.hostId),
    title: activity.title,
    description: activity.description,
    category: activity.category,
    coverUrl: activity.coverUrl,
    locationName: activity.locationName,
    lat: activity.lat,
    lng: activity.lng,
    distanceM: origin
      ? distanceMeters(origin, { lat: activity.lat, lng: activity.lng })
      : null,
    startsAt: activity.startsAt,
    endsAt: activity.endsAt,
    visibility: activity.visibility,
    status: activity.status,
    capacity: activity.capacity,
    acceptedCount: accepted,
    spotsLeft: activity.capacity === null ? null : Math.max(activity.capacity - accepted, 0),
    myStatus: mine?.status ?? null,
    isMine: activity.hostId === me,
  };
}

function toApplicant(db: MockDb, participant: MockParticipant): Applicant {
  return {
    participantId: participant.id,
    profile: toPublicProfile(db, participant.userId),
    status: participant.status,
    introMessage: participant.introMessage,
    createdAt: participant.createdAt,
  };
}

function toMessage(db: MockDb, raw: MockDb["messages"][number]): Message {
  const sender = raw.senderId
    ? db.profiles.find((p) => p.id === raw.senderId)
    : undefined;
  return {
    id: raw.id,
    threadId: raw.threadId,
    senderId: raw.senderId,
    senderName: sender?.displayName ?? null,
    senderAvatar: sender?.avatarUrl ?? null,
    kind: raw.kind,
    body: raw.body,
    imageUrl: raw.imageUrl,
    lat: raw.lat,
    lng: raw.lng,
    items: raw.items,
    createdAt: raw.createdAt,
  };
}

/** Skapar aktivitetens chattgrupp om den inte finns. Värden är alltid med. */
function ensureActivityThread(db: MockDb, activityId: Uuid): Uuid {
  const existing = db.threads.find((t) => t.activityId === activityId);
  if (existing) return existing.id;

  const activity = activityOrThrow(db, activityId);
  const threadId = newId();
  db.threads.push({
    id: threadId,
    kind: "activity",
    activityId,
    title: activity.title,
    lastMessageAt: nowIso(),
  });
  db.threadMembers.push({ threadId, userId: activity.hostId, lastReadAt: nowIso() });
  return threadId;
}

function pushSystemMessage(db: MockDb, threadId: Uuid, body: string): void {
  const message = {
    id: newId(),
    threadId,
    senderId: null,
    kind: "system" as const,
    body,
    imageUrl: null,
    lat: null,
    lng: null,
    items: null,
    createdAt: nowIso(),
  };
  db.messages.push(message);
  const thread = db.threads.find((t) => t.id === threadId);
  if (thread) thread.lastMessageAt = message.createdAt;
  threadListeners.get(threadId)?.forEach((fn) => fn(toMessage(db, message)));
}

/** Markerar passerade aktiviteter som genomförda — samma jobb som complete_due_activities(). */
function completeDueActivities(db: MockDb): void {
  const now = Date.now();
  for (const activity of db.activities) {
    if (
      (activity.status === "open" || activity.status === "full") &&
      new Date(activity.endsAt).getTime() < now
    ) {
      activity.status = "completed";
    }
  }
}

export class MockBackend implements Backend {
  readonly name = "mock";

  /* Inloggning ------------------------------------------------------------ */

  async bankIdStart(personalNumber: string): Promise<BankIdStart> {
    await loadDb();
    const pnr = normalizePnr(personalNumber);
    const payload = JSON.stringify({ pnr, at: Date.now() });
    return {
      orderRef: encodeURIComponent(payload),
      autoStartToken: newId(),
      qrData: `mock.${pnr.slice(-4)}`,
    };
  }

  async bankIdCollect(orderRef: string): Promise<BankIdCollect> {
    const db = await loadDb();

    let order: { pnr: string; at: number };
    try {
      order = JSON.parse(decodeURIComponent(orderRef));
    } catch {
      return { status: "failed", hintCode: "invalidParameters" };
    }

    const age = Date.now() - order.at;
    if (age < SIGNING_DURATION_MS) {
      return {
        status: "pending",
        hintCode: age < 1_000 ? "outstandingTransaction" : "userSign",
      };
    }

    let userId = db.identities[order.pnr];
    let needsOnboarding = false;

    if (!userId) {
      // Deterministiskt förnamn ur personnumret, precis som mock-providern
      // på servern gör — samma testnummer blir samma person.
      let hash = 0;
      for (const ch of order.pnr) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
      const givenName = FIRST_NAMES[hash % FIRST_NAMES.length]!;

      userId = newId();
      db.identities[order.pnr] = userId;
      db.profiles.push({
        id: userId,
        displayName: givenName,
        bio: null,
        avatarUrl: "pending",
        interests: [],
        homeLat: null,
        homeLng: null,
        homeAreaLabel: null,
        birthYear: Number(order.pnr.slice(0, 4)),
        createdAt: nowIso(),
      });
      needsOnboarding = true;
    } else {
      const profile = profileOrThrow(db, userId);
      needsOnboarding = profile.avatarUrl === "pending";
    }

    db.currentUserId = userId;
    await persist();

    const profile = profileOrThrow(db, userId);
    return { status: "complete", needsOnboarding, givenName: profile.displayName };
  }

  async bankIdCancel(): Promise<void> {
    // Tillståndslös mock — inget att avbryta.
  }

  async restoreSession(): Promise<boolean> {
    const db = await loadDb();
    completeDueActivities(db);
    return db.currentUserId !== null;
  }

  async signOut(): Promise<void> {
    const db = await loadDb();
    db.currentUserId = null;
    await persist();
  }

  /* Profil ---------------------------------------------------------------- */

  async getMyProfile(): Promise<MyProfile | null> {
    const db = await loadDb();
    if (!db.currentUserId) return null;

    const p = profileOrThrow(db, db.currentUserId);

    return {
      id: p.id,
      displayName: p.displayName,
      bio: p.bio,
      avatarUrl: p.avatarUrl,
      interests: p.interests,
      homeLat: p.homeLat,
      homeLng: p.homeLng,
      homeAreaLabel: p.homeAreaLabel,
      birthYear: p.birthYear,
      bankIdVerified: true,
      needsOnboarding: p.avatarUrl === "pending" || p.interests.length === 0,
    };
  }

  async updateMyProfile(patch: Partial<MyProfile>): Promise<MyProfile> {
    const db = await loadDb();
    const p = profileOrThrow(db, meOrThrow(db));

    if (patch.displayName !== undefined) p.displayName = patch.displayName;
    if (patch.bio !== undefined) p.bio = patch.bio;
    if (patch.avatarUrl !== undefined) p.avatarUrl = patch.avatarUrl;
    if (patch.interests !== undefined) p.interests = patch.interests;
    if (patch.homeLat !== undefined) p.homeLat = patch.homeLat;
    if (patch.homeLng !== undefined) p.homeLng = patch.homeLng;
    if (patch.homeAreaLabel !== undefined) p.homeAreaLabel = patch.homeAreaLabel;

    await persist();
    const profile = await this.getMyProfile();
    if (!profile) throw new Error("Profilen försvann");
    return profile;
  }

  async getProfile(userId: Uuid): Promise<PublicProfile> {
    const db = await loadDb();
    return toPublicProfile(db, userId);
  }

  async listInterests(): Promise<Interest[]> {
    return INTERESTS;
  }

  /* Aktiviteter ----------------------------------------------------------- */

  async discover(params: DiscoverParams): Promise<ActivityCard[]> {
    const db = await loadDb();
    completeDueActivities(db);
    const me = db.currentUserId;
    const origin = { lat: params.lat, lng: params.lng };
    const from = params.from ? new Date(params.from).getTime() : Date.now();
    const to = params.to ? new Date(params.to).getTime() : Infinity;

    return db.activities
      .filter((a) => {
        if (a.status !== "open") return false;

        const startsAt = new Date(a.startsAt).getTime();
        if (startsAt < from || startsAt > to) return false;

        if (distanceMeters(origin, { lat: a.lat, lng: a.lng }) > params.radiusM) return false;

        if (params.interests?.length && !params.interests.includes(a.category ?? "")) {
          return false;
        }

        if (!me) return a.visibility === "public";
        if (isBlocked(db, a.hostId, me)) return false;
        if (a.hostId === me) return true;
        if (a.visibility === "bff") return areBffs(db, a.hostId, me);
        return true;
      })
      .map((a) => toActivityCard(db, a, origin))
      .sort((x, y) => {
        const byTime = new Date(x.startsAt).getTime() - new Date(y.startsAt).getTime();
        return byTime !== 0 ? byTime : (x.distanceM ?? 0) - (y.distanceM ?? 0);
      });
  }

  async getActivity(activityId: Uuid): Promise<ActivityDetail> {
    const db = await loadDb();
    completeDueActivities(db);
    const activity = activityOrThrow(db, activityId);
    const me = db.currentUserId;

    const rows = db.participants.filter((p) => p.activityId === activityId);
    const isHost = activity.hostId === me;

    const mine = me ? rows.find((p) => p.userId === me) : undefined;
    const card = toActivityCard(db, activity);
    const thread = db.threads.find((t) => t.activityId === activityId);

    return {
      ...card,
      // Bara värden ser vem som har ansökt.
      applicants: isHost
        ? rows.filter((p) => p.status === "pending").map((p) => toApplicant(db, p))
        : [],
      accepted: rows
        .filter((p) => p.status === "accepted")
        .map((p) => toApplicant(db, p)),
      threadId:
        thread && me && db.threadMembers.some((m) => m.threadId === thread.id && m.userId === me)
          ? thread.id
          : null,
      myParticipantId: mine?.id ?? null,
    };
  }

  async createActivity(input: CreateActivityInput): Promise<ActivityCard> {
    const db = await loadDb();
    const me = meOrThrow(db);

    const activity: MockActivity = {
      id: newId(),
      hostId: me,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? null,
      coverUrl: input.coverUrl,
      locationName: input.locationName,
      lat: input.lat,
      lng: input.lng,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      visibility: input.visibility,
      capacity: input.capacity ?? null,
      minAge: input.minAge ?? null,
      status: "open",
      createdAt: nowIso(),
    };

    db.activities.push(activity);
    await persist();
    return toActivityCard(db, activity);
  }

  async cancelActivity(activityId: Uuid, reason: string): Promise<void> {
    const db = await loadDb();
    const me = meOrThrow(db);
    const activity = activityOrThrow(db, activityId);
    if (activity.hostId !== me) throw new Error("Bara värden kan avlysa aktiviteten");

    activity.status = "cancelled";

    // Alla som redan sagt ja måste få veta det i chatten.
    const thread = db.threads.find((t) => t.activityId === activityId);
    if (thread) {
      pushSystemMessage(db, thread.id, `Aktiviteten är inställd: ${reason}`);
    }
    await persist();
  }

  async myActivities(): Promise<{ hosting: ActivityCard[]; joined: ActivityCard[] }> {
    const db = await loadDb();
    completeDueActivities(db);
    const me = meOrThrow(db);

    const byStart = (a: ActivityCard, b: ActivityCard) =>
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

    const hosting = db.activities
      .filter((a) => a.hostId === me)
      .map((a) => toActivityCard(db, a))
      .sort(byStart);

    const joinedIds = db.participants
      .filter((p) => p.userId === me && (p.status === "accepted" || p.status === "pending"))
      .map((p) => p.activityId);

    const joined = db.activities
      .filter((a) => joinedIds.includes(a.id))
      .map((a) => toActivityCard(db, a))
      .sort(byStart);

    return { hosting, joined };
  }

  /* Ansökningar ----------------------------------------------------------- */

  async applyToActivity(activityId: Uuid, message?: string): Promise<void> {
    const db = await loadDb();
    const me = meOrThrow(db);
    const activity = activityOrThrow(db, activityId);

    if (activity.hostId === me) throw new Error("Du är värd för aktiviteten");
    if (activity.status !== "open") throw new Error("Aktiviteten tar inte emot fler ansökningar");
    if (new Date(activity.startsAt).getTime() <= Date.now()) {
      throw new Error("Aktiviteten har redan börjat");
    }
    if (activity.capacity !== null && acceptedCount(db, activityId) >= activity.capacity) {
      throw new Error("Aktiviteten är full");
    }

    const existing = db.participants.find(
      (p) => p.activityId === activityId && p.userId === me,
    );

    if (existing) {
      if (existing.status === "pending" || existing.status === "accepted") return;
      existing.status = "pending";
      existing.introMessage = message ?? existing.introMessage;
      existing.createdAt = nowIso();
    } else {
      db.participants.push({
        id: newId(),
        activityId,
        userId: me,
        status: "pending",
        introMessage: message ?? null,
        createdAt: nowIso(),
      });
    }

    await persist();
  }

  async decideApplication(participantId: Uuid, accept: boolean): Promise<Applicant> {
    const db = await loadDb();
    const me = meOrThrow(db);

    const participant = db.participants.find((p) => p.id === participantId);
    if (!participant) throw new Error("Ansökan finns inte");

    const activity = activityOrThrow(db, participant.activityId);
    if (activity.hostId !== me) throw new Error("Bara värden kan besluta om ansökningar");

    if (!accept) {
      participant.status = "declined";
      await persist();
      return toApplicant(db, participant);
    }

    if (activity.capacity !== null && acceptedCount(db, activity.id) >= activity.capacity) {
      throw new Error("Aktiviteten är redan full");
    }

    participant.status = "accepted";

    // Att acceptera är också det som öppnar chatten — det är hela poängen.
    const threadId = ensureActivityThread(db, activity.id);
    if (!db.threadMembers.some((m) => m.threadId === threadId && m.userId === participant.userId)) {
      db.threadMembers.push({
        threadId,
        userId: participant.userId,
        lastReadAt: nowIso(),
      });
    }
    pushSystemMessage(db, threadId, `${profileOrThrow(db, participant.userId).displayName} är med!`);

    if (activity.capacity !== null && acceptedCount(db, activity.id) >= activity.capacity) {
      activity.status = "full";
    }

    await persist();
    return toApplicant(db, participant);
  }

  async withdrawApplication(participantId: Uuid): Promise<void> {
    const db = await loadDb();
    const me = meOrThrow(db);
    const participant = db.participants.find((p) => p.id === participantId);
    if (!participant) throw new Error("Ansökan finns inte");
    if (participant.userId !== me) throw new Error("Det är inte din ansökan");

    participant.status = "withdrawn";

    // Lämna även chatten, annars ligger man kvar i en grupp man hoppat av.
    const thread = db.threads.find((t) => t.activityId === participant.activityId);
    if (thread) {
      db.threadMembers = db.threadMembers.filter(
        (m) => !(m.threadId === thread.id && m.userId === me),
      );
    }

    // Aktiviteten kan ha varit full — nu finns en plats igen.
    const activity = activityOrThrow(db, participant.activityId);
    if (activity.status === "full") activity.status = "open";

    await persist();
  }

  /* Chatt ----------------------------------------------------------------- */

  async listThreads(): Promise<ThreadSummary[]> {
    const db = await loadDb();
    const me = meOrThrow(db);

    const mine = db.threadMembers.filter((m) => m.userId === me);

    return mine
      .map((membership) => {
        const thread = db.threads.find((t) => t.id === membership.threadId);
        if (!thread) return null;

        const messages = db.messages
          .filter((m) => m.threadId === thread.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const last = messages[messages.length - 1];

        const activity = thread.activityId
          ? db.activities.find((a) => a.id === thread.activityId)
          : undefined;

        // En direktchatt heter vad motparten heter.
        const otherId = db.threadMembers.find(
          (m) => m.threadId === thread.id && m.userId !== me,
        )?.userId;
        const other = otherId ? db.profiles.find((p) => p.id === otherId) : undefined;

        const summary: ThreadSummary = {
          id: thread.id,
          kind: thread.kind,
          title: thread.kind === "activity"
            ? activity?.title ?? thread.title ?? "Aktivitet"
            : other?.displayName ?? "Chatt",
          imageUrl: thread.kind === "activity"
            ? activity?.coverUrl ?? null
            : other?.avatarUrl ?? null,
          activityId: thread.activityId,
          activityStatus: activity?.status ?? null,
          memberCount: db.threadMembers.filter((m) => m.threadId === thread.id).length,
          lastMessage: last ? describeMessage(last, db, me) : null,
          lastMessageAt: thread.lastMessageAt,
          unreadCount: messages.filter(
            (m) => m.createdAt > membership.lastReadAt && m.senderId !== me,
          ).length,
        };
        return summary;
      })
      .filter((t): t is ThreadSummary => t !== null)
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  }

  async listMessages(threadId: Uuid): Promise<Message[]> {
    const db = await loadDb();
    const me = meOrThrow(db);
    if (!db.threadMembers.some((m) => m.threadId === threadId && m.userId === me)) {
      throw new Error("Du är inte med i den här chatten");
    }

    return db.messages
      .filter((m) => m.threadId === threadId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((m) => toMessage(db, m));
  }

  async sendMessage(threadId: Uuid, input: SendMessageInput): Promise<Message> {
    const db = await loadDb();
    const me = meOrThrow(db);
    if (!db.threadMembers.some((m) => m.threadId === threadId && m.userId === me)) {
      throw new Error("Du är inte med i den här chatten");
    }

    const items: ListItem[] | null =
      input.kind === "list"
        ? input.items.map((text) => ({ id: newId(), text, checkedBy: null }))
        : null;

    const raw = {
      id: newId(),
      threadId,
      senderId: me,
      kind: input.kind,
      body: "body" in input ? input.body ?? null : null,
      imageUrl: input.kind === "image" ? input.imageUrl : null,
      lat: input.kind === "place" ? input.lat : null,
      lng: input.kind === "place" ? input.lng : null,
      items,
      createdAt: nowIso(),
    };

    db.messages.push(raw);
    const thread = db.threads.find((t) => t.id === threadId);
    if (thread) thread.lastMessageAt = raw.createdAt;

    await persist();
    const message = toMessage(db, raw);
    threadListeners.get(threadId)?.forEach((fn) => fn(message));
    return message;
  }

  async toggleListItem(messageId: Uuid, itemId: string): Promise<Message> {
    const db = await loadDb();
    const me = meOrThrow(db);

    const raw = db.messages.find((m) => m.id === messageId);
    if (!raw || !raw.items) throw new Error("Listan finns inte");
    if (!db.threadMembers.some((m) => m.threadId === raw.threadId && m.userId === me)) {
      throw new Error("Du är inte med i den här chatten");
    }

    const item = raw.items.find((i) => i.id === itemId);
    if (!item) throw new Error("Punkten finns inte");

    // Vem som helst i tråden får bocka av; att bocka av något någon annan
    // tagit tar över punkten i stället för att blockeras.
    item.checkedBy = item.checkedBy === me ? null : me;

    await persist();
    const message = toMessage(db, raw);
    threadListeners.get(raw.threadId)?.forEach((fn) => fn(message));
    return message;
  }

  async markThreadRead(threadId: Uuid): Promise<void> {
    const db = await loadDb();
    const me = meOrThrow(db);
    const membership = db.threadMembers.find(
      (m) => m.threadId === threadId && m.userId === me,
    );
    if (membership) {
      membership.lastReadAt = nowIso();
      await persist();
    }
  }

  async ensureDirectThread(userId: Uuid): Promise<Uuid> {
    const db = await loadDb();
    const me = meOrThrow(db);
    if (me === userId) throw new Error("Kan inte chatta med dig själv");
    if (isBlocked(db, me, userId)) throw new Error("Chatten är inte tillgänglig");

    const existing = db.threads.find((t) => {
      if (t.kind !== "direct") return false;
      const members = db.threadMembers.filter((m) => m.threadId === t.id);
      return (
        members.length === 2 &&
        members.some((m) => m.userId === me) &&
        members.some((m) => m.userId === userId)
      );
    });
    if (existing) return existing.id;

    const threadId = newId();
    db.threads.push({
      id: threadId,
      kind: "direct",
      activityId: null,
      title: null,
      lastMessageAt: nowIso(),
    });
    db.threadMembers.push(
      { threadId, userId: me, lastReadAt: nowIso() },
      { threadId, userId, lastReadAt: nowIso() },
    );

    await persist();
    return threadId;
  }

  subscribeToThread(threadId: Uuid, onMessage: (message: Message) => void): () => void {
    let listeners = threadListeners.get(threadId);
    if (!listeners) {
      listeners = new Set();
      threadListeners.set(threadId, listeners);
    }
    listeners.add(onMessage);

    return () => {
      listeners!.delete(onMessage);
      if (listeners!.size === 0) threadListeners.delete(threadId);
    };
  }

  /* Göra om det? ---------------------------------------------------------- */

  async rematchPrompts(): Promise<RematchPrompt[]> {
    const db = await loadDb();
    completeDueActivities(db);
    const me = meOrThrow(db);
    const now = Date.now();

    const prompts: RematchPrompt[] = [];

    for (const activity of db.activities) {
      if (activity.status !== "completed") continue;

      const ended = new Date(activity.endsAt).getTime();
      if (ended > now || now - ended > WINDOW_MS) continue;

      const iWasThere =
        activity.hostId === me ||
        db.participants.some(
          (p) => p.activityId === activity.id && p.userId === me && p.status === "accepted",
        );
      if (!iWasThere) continue;

      const attendees = new Set<Uuid>([activity.hostId]);
      for (const p of db.participants) {
        if (p.activityId === activity.id && p.status === "accepted") attendees.add(p.userId);
      }
      attendees.delete(me);

      for (const userId of attendees) {
        if (isBlocked(db, me, userId)) continue;

        const answered = db.rematches.some(
          (r) => r.activityId === activity.id && r.fromUser === me && r.toUser === userId,
        );
        if (answered) continue;

        const person = profileOrThrow(db, userId);
        prompts.push({
          activityId: activity.id,
          activityTitle: activity.title,
          endsAt: activity.endsAt,
          userId: person.id,
          displayName: person.displayName,
          avatarUrl: person.avatarUrl,
        });
      }
    }

    return prompts.sort((a, b) => b.endsAt.localeCompare(a.endsAt));
  }

  async submitRematch(activityId: Uuid, userId: Uuid, wantsAgain: boolean): Promise<void> {
    const db = await loadDb();
    const me = meOrThrow(db);
    if (me === userId) throw new Error("Du kan inte svara om dig själv");

    const activity = activityOrThrow(db, activityId);
    if (new Date(activity.endsAt).getTime() > Date.now()) {
      throw new Error("Aktiviteten är inte slut än");
    }

    const wasThere = (candidate: Uuid) =>
      activity.hostId === candidate ||
      db.participants.some(
        (p) => p.activityId === activity.id && p.userId === candidate && p.status === "accepted",
      );

    if (!wasThere(me) || !wasThere(userId)) {
      throw new Error("Ni var inte båda med på aktiviteten");
    }

    const existing = db.rematches.find(
      (r) => r.activityId === activityId && r.fromUser === me && r.toUser === userId,
    );

    if (existing) {
      existing.wantsAgain = wantsAgain;
      existing.acknowledgedAt = null;
      existing.createdAt = nowIso();
    } else {
      db.rematches.push({
        activityId,
        fromUser: me,
        toUser: userId,
        wantsAgain,
        acknowledgedAt: null,
        createdAt: nowIso(),
      });
    }

    await persist();
  }

  async rematches(): Promise<Rematch[]> {
    const db = await loadDb();
    const me = meOrThrow(db);

    // Bara dubbla ja lämnar den här funktionen. Ett ensidigt ja — åt något
    // håll — ger ingenting, och den som svarat nej syns aldrig här.
    return db.rematches
      .filter((mine) => {
        if (mine.fromUser !== me || !mine.wantsAgain || mine.acknowledgedAt) return false;
        if (isBlocked(db, me, mine.toUser)) return false;
        return db.rematches.some(
          (theirs) =>
            theirs.activityId === mine.activityId &&
            theirs.fromUser === mine.toUser &&
            theirs.toUser === me &&
            theirs.wantsAgain,
        );
      })
      .map((mine) => {
        const person = profileOrThrow(db, mine.toUser);
        const activity = activityOrThrow(db, mine.activityId);
        const theirs = db.rematches.find(
          (r) =>
            r.activityId === mine.activityId &&
            r.fromUser === mine.toUser &&
            r.toUser === me,
        );
        return {
          userId: person.id,
          displayName: person.displayName,
          avatarUrl: person.avatarUrl,
          homeAreaLabel: person.homeAreaLabel,
          activityId: activity.id,
          activityTitle: activity.title,
          matchedAt:
            theirs && theirs.createdAt > mine.createdAt ? theirs.createdAt : mine.createdAt,
        };
      })
      .sort((a, b) => b.matchedAt.localeCompare(a.matchedAt));
  }

  async acknowledgeRematch(activityId: Uuid, userId: Uuid): Promise<void> {
    const db = await loadDb();
    const me = meOrThrow(db);
    const row = db.rematches.find(
      (r) => r.activityId === activityId && r.fromUser === me && r.toUser === userId,
    );
    if (row) {
      row.acknowledgedAt = nowIso();
      await persist();
    }
  }

  /* BFF ------------------------------------------------------------------- */

  async listBffs(): Promise<PublicProfile[]> {
    const db = await loadDb();
    const me = meOrThrow(db);

    return db.friendships
      .filter((f) => f.status === "accepted" && (f.requesterId === me || f.addresseeId === me))
      .map((f) => toPublicProfile(db, f.requesterId === me ? f.addresseeId : f.requesterId))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "sv"));
  }

  async listBffRequests(): Promise<BffRequest[]> {
    const db = await loadDb();
    const me = meOrThrow(db);

    return db.friendships
      .filter((f) => f.status === "pending" && (f.requesterId === me || f.addresseeId === me))
      .map((f) => ({
        friendshipId: f.id,
        profile: toPublicProfile(db, f.requesterId === me ? f.addresseeId : f.requesterId),
        createdAt: f.createdAt,
        incoming: f.addresseeId === me,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async requestBff(userId: Uuid): Promise<void> {
    const db = await loadDb();
    const me = meOrThrow(db);
    if (me === userId) throw new Error("Du är redan din egen bästa vän");

    const existing = friendshipBetween(db, me, userId);

    if (existing) {
      // Har de redan frågat dig? Då är din förfrågan ett ja.
      if (existing.status === "pending" && existing.addresseeId === me) {
        existing.status = "accepted";
      } else if (existing.status === "declined") {
        existing.requesterId = me;
        existing.addresseeId = userId;
        existing.status = "pending";
        existing.createdAt = nowIso();
      }
    } else {
      db.friendships.push({
        id: newId(),
        requesterId: me,
        addresseeId: userId,
        status: "pending",
        createdAt: nowIso(),
      });
    }

    await persist();
  }

  async respondBff(friendshipId: Uuid, accept: boolean): Promise<void> {
    const db = await loadDb();
    const me = meOrThrow(db);
    const friendship = db.friendships.find((f) => f.id === friendshipId);
    if (!friendship) throw new Error("Förfrågan finns inte");
    if (friendship.addresseeId !== me) throw new Error("Förfrågan är inte till dig");

    friendship.status = accept ? "accepted" : "declined";
    await persist();
  }

  async removeBff(friendshipId: Uuid): Promise<void> {
    const db = await loadDb();
    const me = meOrThrow(db);
    db.friendships = db.friendships.filter(
      (f) => !(f.id === friendshipId && (f.requesterId === me || f.addresseeId === me)),
    );
    await persist();
  }

  /* Trygghet -------------------------------------------------------------- */

  async blockUser(userId: Uuid): Promise<void> {
    const db = await loadDb();
    const me = meOrThrow(db);
    if (!db.blocks.some((b) => b.blockerId === me && b.blockedId === userId)) {
      db.blocks.push({ blockerId: me, blockedId: userId });
    }
    // En blockering upphäver vänskapen — annars ligger de kvar i BFF-listan.
    db.friendships = db.friendships.filter(
      (f) =>
        !(
          (f.requesterId === me && f.addresseeId === userId) ||
          (f.requesterId === userId && f.addresseeId === me)
        ),
    );
    await persist();
  }

  async reportUser(userId: Uuid, reason: string, details?: string): Promise<void> {
    const db = await loadDb();
    const me = meOrThrow(db);
    db.reports.push({
      id: newId(),
      reporterId: me,
      reportedUserId: userId,
      reason,
      details: details ?? null,
      createdAt: nowIso(),
    });
    await persist();
  }

  /* Bilder ---------------------------------------------------------------- */

  async uploadImage(_bucket: ImageBucket, localUri: string): Promise<string> {
    // Utan server finns ingen uppladdning — den lokala fil-URI:n duger som
    // "url" eftersom bara den här telefonen ska visa bilden.
    return localUri;
  }

  /** Bara mocken: kastar allt lokalt och börjar om från seed. */
  async reset(): Promise<void> {
    await resetDb();
    threadListeners.clear();
  }
}

/** Kort sammanfattning av senaste meddelandet, för trådlistan. */
function describeMessage(raw: MockDb["messages"][number], db: MockDb, me: Uuid): string {
  const who = raw.senderId === me
    ? "Du"
    : db.profiles.find((p) => p.id === raw.senderId)?.displayName ?? "";

  switch (raw.kind) {
    case "system": return raw.body ?? "";
    case "image":  return `${who}: 📷 Bild`;
    case "place":  return `${who}: 📍 ${raw.body ?? "Plats"}`;
    case "list":   return `${who}: 📋 ${raw.body ?? "Lista"}`;
    default:       return `${who}: ${raw.body ?? ""}`;
  }
}
