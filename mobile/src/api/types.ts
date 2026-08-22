/**
 * Domäntyper, appens gemensamma vokabulär.
 *
 * De här formerna är det enda både mock-backendet och Supabase-backendet lovar
 * att leverera. Skärmarna vet inte vilket som är inkopplat.
 */

export type Uuid = string;
export type IsoDate = string;

export type ActivityVisibility = "public" | "friends";
export type ActivityStatus = "draft" | "open" | "full" | "cancelled" | "completed";
export type JoinStatus = "pending" | "accepted" | "declined" | "withdrawn" | "removed";
export type MessageKind = "text" | "image" | "place" | "list" | "system";
export type FriendshipStatus = "pending" | "accepted" | "declined";

export interface Interest {
  slug: string;
  label: string;
  /** Namn på en Ionicons-linjeikon. Aldrig emoji, se api/interests.ts. */
  icon: string;
}

/** Din egen profil, inkluderar det bara du får se. */
export interface MyProfile {
  id: Uuid;
  displayName: string;
  bio: string | null;
  avatarUrl: string;
  interests: string[];
  homeLat: number | null;
  homeLng: number | null;
  homeAreaLabel: string | null;
  birthYear: number;
  bankIdVerified: boolean;
  /** Sant tills namn och bild är på plats. Styr om onboarding visas. */
  needsOnboarding: boolean;
}

/**
 * Någon annans profil, beskuren. Inga koordinater, inget juridiskt namn.
 *
 * Och inget omdöme. Siffrorna här är fakta om vad personen gjort; ingen av
 * dem är någon annans åsikt om hen.
 */
export interface PublicProfile {
  id: Uuid;
  displayName: string;
  bio: string | null;
  avatarUrl: string;
  interests: string[];
  homeAreaLabel: string | null;
  approxAge: number;
  bankIdVerified: boolean;
  memberSince: IsoDate;
  activitiesHosted: number;
  activitiesJoined: number;
  friendCount: number;
  /** Relationen mellan dig och den här personen. */
  friendStatus: FriendshipStatus | "none";
  friendRequestId: Uuid | null;
  /** Sant när förfrågan väntar på ditt svar (inte på deras). */
  friendAwaitingMyAnswer: boolean;
}

export interface ActivityCard {
  id: Uuid;
  hostId: Uuid;
  hostName: string;
  hostAvatar: string;
  /** Antal genomförda aktiviteter värden varit med på. Fakta, inte omdöme. */
  hostActivityCount: number;
  title: string;
  description: string | null;
  category: string | null;
  coverUrl: string;
  locationName: string;
  lat: number;
  lng: number;
  distanceM: number | null;
  startsAt: IsoDate;
  endsAt: IsoDate;
  visibility: ActivityVisibility;
  status: ActivityStatus;
  capacity: number | null;
  acceptedCount: number;
  spotsLeft: number | null;
  /** Din relation till aktiviteten, om någon. */
  myStatus: JoinStatus | null;
  isMine: boolean;
}

/**
 * Sökandens vana vid just den här sortens aktivitet. Beskriver aktiviteten,
 * inte personen: "första gången" är en upplysning, inte en brist.
 */
export type ExperienceLevel = "first_time" | "some" | "often";

export interface Applicant {
  participantId: Uuid;
  profile: PublicProfile;
  status: JoinStatus;
  introMessage: string | null;
  experience: ExperienceLevel | null;
  createdAt: IsoDate;
}

export interface ActivityDetail extends ActivityCard {
  applicants: Applicant[];
  accepted: Applicant[];
  threadId: Uuid | null;
  myParticipantId: Uuid | null;
}

export interface CreateActivityInput {
  title: string;
  description?: string;
  category?: string;
  coverUrl: string;
  locationName: string;
  lat: number;
  lng: number;
  startsAt: IsoDate;
  endsAt: IsoDate;
  visibility: ActivityVisibility;
  capacity?: number | null;
  minAge?: number | null;
}

export interface ListItem {
  id: string;
  text: string;
  checkedBy: Uuid | null;
}

export interface Message {
  id: Uuid;
  threadId: Uuid;
  senderId: Uuid | null;
  senderName: string | null;
  senderAvatar: string | null;
  kind: MessageKind;
  body: string | null;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
  items: ListItem[] | null;
  createdAt: IsoDate;
}

export type SendMessageInput =
  | { kind: "text"; body: string }
  | { kind: "image"; imageUrl: string; body?: string }
  | { kind: "place"; lat: number; lng: number; body: string }
  | { kind: "list"; body: string; items: string[] };

export interface ThreadSummary {
  id: Uuid;
  kind: "activity" | "direct";
  title: string;
  /** Aktivitetens omslag, eller motpartens avatar i en direktchatt. */
  imageUrl: string | null;
  activityId: Uuid | null;
  activityStatus: ActivityStatus | null;
  memberCount: number;
  lastMessage: string | null;
  lastMessageAt: IsoDate;
  unreadCount: number;
}

/**
 * En person du ännu inte svarat om efter en genomförd aktivitet.
 */
export interface RematchPrompt {
  activityId: Uuid;
  activityTitle: string;
  endsAt: IsoDate;
  userId: Uuid;
  displayName: string;
  avatarUrl: string;
}

/**
 * Ett dubbelt ja. Uppstår bara när båda sagt att de vill göra om det:
 * ett ensidigt ja blir aldrig något alls, och den som sagt nej får aldrig
 * veta att någon sagt ja om hen.
 */
export interface Rematch {
  userId: Uuid;
  displayName: string;
  avatarUrl: string;
  homeAreaLabel: string | null;
  activityId: Uuid;
  activityTitle: string;
  matchedAt: IsoDate;
}

export interface FriendRequest {
  friendshipId: Uuid;
  profile: PublicProfile;
  createdAt: IsoDate;
  /** true = de frågade dig, false = du frågade dem. */
  incoming: boolean;
}

export interface DiscoverParams {
  lat: number;
  lng: number;
  radiusM: number;
  interests?: string[];
  from?: IsoDate;
  to?: IsoDate;
}

export interface BankIdStart {
  orderRef: string;
  autoStartToken: string;
  qrData?: string;
}

export interface BankIdCollect {
  status: "pending" | "complete" | "failed";
  hintCode?: string;
  qrData?: string;
  needsOnboarding?: boolean;
  givenName?: string;
}

export type ImageBucket = "avatars" | "activity-covers" | "chat-images";
