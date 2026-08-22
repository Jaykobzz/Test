/**
 * Backend-gränssnittet.
 *
 * Två implementationer uppfyller det: `mock/` (allt lokalt på telefonen, ingen
 * server) och `supabase/` (riktig databas, RLS, BankID). Skärmarna importerar
 * aldrig någon av dem direkt — de går via `getBackend()` i ./index.ts.
 */

import type {
  ActivityCard,
  ActivityDetail,
  Applicant,
  BankIdCollect,
  BankIdStart,
  BffRequest,
  CreateActivityInput,
  DiscoverParams,
  ImageBucket,
  Interest,
  Message,
  MyProfile,
  PublicProfile,
  Rematch,
  RematchPrompt,
  SendMessageInput,
  ThreadSummary,
  Uuid,
} from "./types";

export interface Backend {
  readonly name: string;

  /* Inloggning ------------------------------------------------------------ */
  bankIdStart(personalNumber: string): Promise<BankIdStart>;
  bankIdCollect(orderRef: string): Promise<BankIdCollect>;
  bankIdCancel(orderRef: string): Promise<void>;
  restoreSession(): Promise<boolean>;
  signOut(): Promise<void>;

  /* Profil ---------------------------------------------------------------- */
  getMyProfile(): Promise<MyProfile | null>;
  updateMyProfile(patch: Partial<Omit<MyProfile, "id">>): Promise<MyProfile>;
  getProfile(userId: Uuid): Promise<PublicProfile>;
  listInterests(): Promise<Interest[]>;

  /* Aktiviteter ----------------------------------------------------------- */
  discover(params: DiscoverParams): Promise<ActivityCard[]>;
  getActivity(activityId: Uuid): Promise<ActivityDetail>;
  createActivity(input: CreateActivityInput): Promise<ActivityCard>;
  cancelActivity(activityId: Uuid, reason: string): Promise<void>;
  myActivities(): Promise<{ hosting: ActivityCard[]; joined: ActivityCard[] }>;

  /* Ansökningar ----------------------------------------------------------- */
  applyToActivity(activityId: Uuid, message?: string): Promise<void>;
  decideApplication(participantId: Uuid, accept: boolean): Promise<Applicant>;
  withdrawApplication(participantId: Uuid): Promise<void>;

  /* Chatt ----------------------------------------------------------------- */
  listThreads(): Promise<ThreadSummary[]>;
  listMessages(threadId: Uuid, beforeIso?: string): Promise<Message[]>;
  sendMessage(threadId: Uuid, input: SendMessageInput): Promise<Message>;
  toggleListItem(messageId: Uuid, itemId: string): Promise<Message>;
  markThreadRead(threadId: Uuid): Promise<void>;
  ensureDirectThread(userId: Uuid): Promise<Uuid>;
  /** Returnerar en avregistreringsfunktion. */
  subscribeToThread(threadId: Uuid, onMessage: (message: Message) => void): () => void;

  /* Göra om det? ---------------------------------------------------------- */
  /** Personer du ännu inte svarat om efter en genomförd aktivitet. */
  rematchPrompts(): Promise<RematchPrompt[]>;
  /** Svaret är privat. Ett `false` får aldrig någon konsekvens någonstans. */
  submitRematch(activityId: Uuid, userId: Uuid, wantsAgain: boolean): Promise<void>;
  /** Bara dubbla ja. Returnerar aldrig något om ensidiga svar. */
  rematches(): Promise<Rematch[]>;
  acknowledgeRematch(activityId: Uuid, userId: Uuid): Promise<void>;

  /* BFF ------------------------------------------------------------------- */
  listBffs(): Promise<PublicProfile[]>;
  listBffRequests(): Promise<BffRequest[]>;
  requestBff(userId: Uuid): Promise<void>;
  respondBff(friendshipId: Uuid, accept: boolean): Promise<void>;
  removeBff(friendshipId: Uuid): Promise<void>;

  /* Trygghet -------------------------------------------------------------- */
  blockUser(userId: Uuid): Promise<void>;
  reportUser(userId: Uuid, reason: string, details?: string): Promise<void>;

  /* Bilder ---------------------------------------------------------------- */
  uploadImage(bucket: ImageBucket, localUri: string, pathPrefix?: string): Promise<string>;
}
