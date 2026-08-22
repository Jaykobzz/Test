/**
 * Supabase-backend.
 *
 * Tunt lager: nästan all logik ligger i databasen som RPC:er och RLS-policies,
 * så det mesta här är att anropa rätt funktion och översätta snake_case till
 * appens camelCase. Regler som "bara värden får acceptera" står medvetet INTE
 * här, de hör hemma i databasen, där de inte kan kringgås av en klient.
 */

import * as FileSystem from "expo-file-system";

import type { Backend } from "../backend";
import type {
  ActivityCard,
  ActivityDetail,
  Applicant,
  BankIdCollect,
  BankIdStart,
  FriendRequest,
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
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "./client";

/* Radformer som kommer ur databasen -------------------------------------- */

interface ProfileRow {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string;
  interests: string[];
  home_area_label: string | null;
  approx_age: number;
  bankid_verified: boolean;
  member_since: string;
  activities_hosted: number;
  activities_joined: number;
  friend_count: number;
}

interface ActivityRow {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  category: string | null;
  cover_url: string;
  location_name: string;
  lat: number;
  lng: number;
  starts_at: string;
  ends_at: string;
  visibility: ActivityCard["visibility"];
  status: ActivityCard["status"];
  capacity: number | null;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

async function currentUserId(): Promise<Uuid> {
  const { data } = await supabase().auth.getUser();
  if (!data.user) throw new Error("Inte inloggad");
  return data.user.id;
}

function toPublicProfile(
  row: ProfileRow,
  friendship?: { id: string; status: FriendshipStatus; addressee_id: string },
  meId?: string,
): PublicProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    interests: row.interests ?? [],
    homeAreaLabel: row.home_area_label,
    approxAge: row.approx_age,
    bankIdVerified: row.bankid_verified,
    memberSince: row.member_since,
    activitiesHosted: row.activities_hosted,
    activitiesJoined: row.activities_joined,
    friendCount: row.friend_count,
    friendStatus: friendship?.status ?? "none",
    friendRequestId: friendship?.id ?? null,
    friendAwaitingMyAnswer:
      !!friendship && friendship.status === "pending" && friendship.addressee_id === meId,
  };
}

function toMessage(row: {
  id: string;
  thread_id: string;
  sender_id: string | null;
  kind: Message["kind"];
  body: string | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  payload: { items?: ListItem[] } | null;
  created_at: string;
  sender?: { display_name: string; avatar_url: string } | null;
}): Message {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    senderName: row.sender?.display_name ?? null,
    senderAvatar: row.sender?.avatar_url ?? null,
    kind: row.kind,
    body: row.body,
    imageUrl: row.image_url,
    lat: row.lat,
    lng: row.lng,
    items: row.payload?.items ?? null,
    createdAt: row.created_at,
  };
}

export class SupabaseBackend implements Backend {
  readonly name = "supabase";

  /* Inloggning ------------------------------------------------------------ */

  /** Anropar edge-funktionen bankid-auth utan session, vi har ingen än. */
  private async callBankId(action: string, body: object): Promise<Record<string, unknown>> {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/bankid-auth/${action}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const json = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new Error(String(json.error ?? "BankID svarade med ett fel"));
    return json;
  }

  async bankIdStart(personalNumber: string): Promise<BankIdStart> {
    const json = await this.callBankId("start", { personalNumber });
    return {
      orderRef: String(json.orderRef),
      autoStartToken: String(json.autoStartToken),
      qrData: json.qrData ? String(json.qrData) : undefined,
    };
  }

  async bankIdCollect(orderRef: string): Promise<BankIdCollect> {
    const json = await this.callBankId("collect", { orderRef });
    const status = json.status as BankIdCollect["status"];

    if (status !== "complete") {
      return {
        status,
        hintCode: json.hintCode ? String(json.hintCode) : undefined,
        qrData: json.qrData ? String(json.qrData) : undefined,
      };
    }

    // Engångstoken från servern växlas mot en riktig session här på klienten.
    const { error } = await supabase().auth.verifyOtp({
      type: "email",
      token_hash: String(json.tokenHash),
    });
    fail(error);

    return {
      status: "complete",
      needsOnboarding: Boolean(json.needsOnboarding),
      givenName: json.givenName ? String(json.givenName) : undefined,
    };
  }

  async bankIdCancel(orderRef: string): Promise<void> {
    await this.callBankId("cancel", { orderRef }).catch(() => undefined);
  }

  async restoreSession(): Promise<boolean> {
    const { data } = await supabase().auth.getSession();
    return data.session !== null;
  }

  async signOut(): Promise<void> {
    await supabase().auth.signOut();
  }

  /* Profil ---------------------------------------------------------------- */

  async getMyProfile(): Promise<MyProfile | null> {
    const { data: session } = await supabase().auth.getSession();
    if (!session.session) return null;

    const { data, error } = await supabase()
      .from("profiles")
      .select("id, display_name, bio, avatar_url, interests, home_lat, home_lng, home_area_label, birth_year, verified_at")
      .eq("id", session.session.user.id)
      .maybeSingle();
    fail(error);
    if (!data) return null;

    return {
      id: data.id,
      displayName: data.display_name,
      bio: data.bio,
      avatarUrl: data.avatar_url,
      interests: data.interests ?? [],
      homeLat: data.home_lat,
      homeLng: data.home_lng,
      homeAreaLabel: data.home_area_label,
      birthYear: data.birth_year,
      bankIdVerified: data.verified_at !== null,
      needsOnboarding: data.avatar_url === "pending" || (data.interests ?? []).length === 0,
    };
  }

  async updateMyProfile(patch: Partial<MyProfile>): Promise<MyProfile> {
    const id = await currentUserId();

    // Endast kolumnerna nedan är skrivbara för `authenticated`, resten
    // avvisas av kolumngrants i migrationen även om de skulle skickas med.
    const row: Record<string, unknown> = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
    if (patch.interests !== undefined) row.interests = patch.interests;
    if (patch.homeLat !== undefined) row.home_lat = patch.homeLat;
    if (patch.homeLng !== undefined) row.home_lng = patch.homeLng;
    if (patch.homeAreaLabel !== undefined) row.home_area_label = patch.homeAreaLabel;

    const { error } = await supabase().from("profiles").update(row).eq("id", id);
    fail(error);

    const profile = await this.getMyProfile();
    if (!profile) throw new Error("Profilen försvann");
    return profile;
  }

  async getProfile(userId: Uuid): Promise<PublicProfile> {
    const me = await currentUserId();

    const { data, error } = await supabase()
      .from("public_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle<ProfileRow>();
    fail(error);
    if (!data) throw new Error("Profilen finns inte");

    const { data: friendship } = await supabase()
      .from("friendships")
      .select("id, status, addressee_id")
      .or(`and(requester_id.eq.${me},addressee_id.eq.${userId}),`
        + `and(requester_id.eq.${userId},addressee_id.eq.${me})`)
      .maybeSingle<{ id: string; status: FriendshipStatus; addressee_id: string }>();

    return toPublicProfile(data, friendship ?? undefined, me);
  }

  async listInterests(): Promise<Interest[]> {
    const { data, error } = await supabase()
      .from("interests")
      .select("slug, label, icon")
      .order("sort_order");
    fail(error);
    return data ?? [];
  }

  /* Aktiviteter ----------------------------------------------------------- */

  async discover(params: DiscoverParams): Promise<ActivityCard[]> {
    const me = await currentUserId();

    const { data, error } = await supabase().rpc("discover_activities", {
      p_lat: params.lat,
      p_lng: params.lng,
      p_radius_m: params.radiusM,
      p_interests: params.interests?.length ? params.interests : null,
      p_from: params.from ?? new Date().toISOString(),
      p_to: params.to ?? null,
    });
    fail(error);

    return (data ?? []).map((row: Record<string, never>) => ({
      id: row.id,
      hostId: row.host_id,
      hostName: row.host_name,
      hostAvatar: row.host_avatar,
      hostActivityCount: row.host_activity_count,
      title: row.title,
      description: row.description,
      category: row.category,
      coverUrl: row.cover_url,
      locationName: row.location_name,
      lat: row.lat,
      lng: row.lng,
      distanceM: row.distance_m,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      visibility: row.visibility,
      status: "open" as const,
      capacity: row.capacity,
      acceptedCount: row.accepted_count,
      spotsLeft: row.spots_left,
      myStatus: row.my_status ?? null,
      isMine: row.host_id === me,
    }));
  }

  async getActivity(activityId: Uuid): Promise<ActivityDetail> {
    const me = await currentUserId();

    const { data: activity, error } = await supabase()
      .from("activities")
      .select("*, host:profiles!activities_host_id_fkey(display_name, avatar_url)")
      .eq("id", activityId)
      .maybeSingle<ActivityRow & { host: { display_name: string; avatar_url: string } }>();
    fail(error);
    if (!activity) throw new Error("Aktiviteten finns inte");

    const { data: participants } = await supabase()
      .from("activity_participants")
      .select("id, user_id, status, intro_message, created_at")
      .eq("activity_id", activityId);

    const rows = participants ?? [];
    const profileIds = rows.map((r) => r.user_id);

    const { data: profiles } = profileIds.length
      ? await supabase().from("public_profiles").select("*").in("id", profileIds)
      : { data: [] as ProfileRow[] };

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p as ProfileRow]));

    const toApplicant = (row: typeof rows[number]): Applicant | null => {
      const profile = profileById.get(row.user_id);
      if (!profile) return null;
      return {
        participantId: row.id,
        profile: toPublicProfile(profile, undefined, me),
        status: row.status,
        introMessage: row.intro_message,
        createdAt: row.created_at,
      };
    };

    const notNull = <T,>(x: T | null): x is T => x !== null;
    const accepted = rows.filter((r) => r.status === "accepted").map(toApplicant).filter(notNull);
    const pending = rows.filter((r) => r.status === "pending").map(toApplicant).filter(notNull);

    const { data: thread } = await supabase()
      .from("threads")
      .select("id")
      .eq("activity_id", activityId)
      .maybeSingle<{ id: string }>();

    const { data: hostProfile } = await supabase()
      .from("public_profiles")
      .select("activities_hosted")
      .eq("id", activity.host_id)
      .maybeSingle<{ activities_hosted: number }>();

    const mine = rows.find((r) => r.user_id === me);

    return {
      id: activity.id,
      hostId: activity.host_id,
      hostName: activity.host.display_name,
      hostAvatar: activity.host.avatar_url,
      hostActivityCount: hostProfile?.activities_hosted ?? 0,
      title: activity.title,
      description: activity.description,
      category: activity.category,
      coverUrl: activity.cover_url,
      locationName: activity.location_name,
      lat: activity.lat,
      lng: activity.lng,
      distanceM: null,
      startsAt: activity.starts_at,
      endsAt: activity.ends_at,
      visibility: activity.visibility,
      status: activity.status,
      capacity: activity.capacity,
      acceptedCount: accepted.length,
      spotsLeft: activity.capacity === null
        ? null
        : Math.max(activity.capacity - accepted.length, 0),
      myStatus: mine?.status ?? null,
      isMine: activity.host_id === me,
      // RLS returnerar bara ansökningar till värden, listan är tom för andra.
      applicants: pending,
      accepted,
      threadId: thread?.id ?? null,
      myParticipantId: mine?.id ?? null,
    };
  }

  async createActivity(input: CreateActivityInput): Promise<ActivityCard> {
    const me = await currentUserId();

    const { data, error } = await supabase()
      .from("activities")
      .insert({
        host_id: me,
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        cover_url: input.coverUrl,
        location_name: input.locationName,
        lat: input.lat,
        lng: input.lng,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        visibility: input.visibility,
        capacity: input.capacity ?? null,
        min_age: input.minAge ?? null,
      })
      .select()
      .single<ActivityRow>();
    fail(error);

    return this.getActivity(data!.id);
  }

  async cancelActivity(activityId: Uuid, reason: string): Promise<void> {
    const { error } = await supabase()
      .from("activities")
      .update({ status: "cancelled", cancelled_reason: reason })
      .eq("id", activityId);
    fail(error);
  }

  async myActivities(): Promise<{ hosting: ActivityCard[]; joined: ActivityCard[] }> {
    const me = await currentUserId();

    const { data: hostingRows } = await supabase()
      .from("activities")
      .select("id")
      .eq("host_id", me)
      .order("starts_at");

    const { data: joinedRows } = await supabase()
      .from("activity_participants")
      .select("activity_id")
      .eq("user_id", me)
      .in("status", ["pending", "accepted"]);

    const hosting = await Promise.all(
      (hostingRows ?? []).map((r) => this.getActivity(r.id)),
    );
    const joined = await Promise.all(
      (joinedRows ?? []).map((r) => this.getActivity(r.activity_id)),
    );

    return { hosting, joined };
  }

  /* Ansökningar ----------------------------------------------------------- */

  async applyToActivity(activityId: Uuid, message?: string): Promise<void> {
    const { error } = await supabase().rpc("apply_to_activity", {
      p_activity_id: activityId,
      p_message: message ?? null,
    });
    fail(error);
  }

  async decideApplication(participantId: Uuid, accept: boolean): Promise<Applicant> {
    const me = await currentUserId();

    const { data, error } = await supabase()
      .rpc("decide_application", { p_participant_id: participantId, p_accept: accept })
      .single<{ id: string; user_id: string; status: Applicant["status"];
                intro_message: string | null; created_at: string }>();
    fail(error);

    const { data: profile } = await supabase()
      .from("public_profiles")
      .select("*")
      .eq("id", data!.user_id)
      .single<ProfileRow>();

    return {
      participantId: data!.id,
      profile: toPublicProfile(profile!, undefined, me),
      status: data!.status,
      introMessage: data!.intro_message,
      createdAt: data!.created_at,
    };
  }

  async withdrawApplication(participantId: Uuid): Promise<void> {
    const { error } = await supabase()
      .from("activity_participants")
      .update({ status: "withdrawn" })
      .eq("id", participantId);
    fail(error);
  }

  /* Chatt ----------------------------------------------------------------- */

  async listThreads(): Promise<ThreadSummary[]> {
    const me = await currentUserId();

    const { data: memberships, error } = await supabase()
      .from("thread_members")
      .select("thread_id, last_read_at, thread:threads(id, kind, activity_id, title, last_message_at, activity:activities(title, cover_url, status))")
      .eq("user_id", me);
    fail(error);

    const summaries = await Promise.all((memberships ?? []).map(async (row) => {
      const thread = row.thread as unknown as {
        id: string; kind: "activity" | "direct"; activity_id: string | null;
        title: string | null; last_message_at: string;
        activity: { title: string; cover_url: string; status: ActivityCard["status"] } | null;
      } | null;
      if (!thread) return null;

      const { data: last } = await supabase()
        .from("messages")
        .select("kind, body, sender_id, sender:profiles!messages_sender_id_fkey(display_name)")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: unread } = await supabase()
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", thread.id)
        .gt("created_at", row.last_read_at)
        .neq("sender_id", me);

      const { data: members, count: memberCount } = await supabase()
        .from("thread_members")
        .select("user_id", { count: "exact" })
        .eq("thread_id", thread.id);

      let title = thread.activity?.title ?? thread.title ?? "Chatt";
      let imageUrl = thread.activity?.cover_url ?? null;

      if (thread.kind === "direct") {
        const otherId = (members ?? []).find((m) => m.user_id !== me)?.user_id;
        if (otherId) {
          const { data: other } = await supabase()
            .from("public_profiles")
            .select("display_name, avatar_url")
            .eq("id", otherId)
            .maybeSingle<{ display_name: string; avatar_url: string }>();
          title = other?.display_name ?? "Chatt";
          imageUrl = other?.avatar_url ?? null;
        }
      }

      const senderName = (last?.sender as unknown as { display_name: string } | null)
        ?.display_name;
      const who = last?.sender_id === me ? "Du" : senderName ?? "";

      const summary: ThreadSummary = {
        id: thread.id,
        kind: thread.kind,
        title,
        imageUrl,
        activityId: thread.activity_id,
        activityStatus: thread.activity?.status ?? null,
        memberCount: memberCount ?? 0,
        lastMessage: last
          ? last.kind === "system" ? last.body : `${who}: ${describeKind(last.kind, last.body)}`
          : null,
        lastMessageAt: thread.last_message_at,
        unreadCount: unread ?? 0,
      };
      return summary;
    }));

    return summaries
      .filter((s): s is ThreadSummary => s !== null)
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  }

  async listMessages(threadId: Uuid, beforeIso?: string): Promise<Message[]> {
    let query = supabase()
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_fkey(display_name, avatar_url)")
      .eq("thread_id", threadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (beforeIso) query = query.lt("created_at", beforeIso);

    const { data, error } = await query;
    fail(error);

    return (data ?? []).map(toMessage).reverse();
  }

  async sendMessage(threadId: Uuid, input: SendMessageInput): Promise<Message> {
    const me = await currentUserId();

    const row: Record<string, unknown> = {
      thread_id: threadId,
      sender_id: me,
      kind: input.kind,
      body: "body" in input ? input.body ?? null : null,
    };

    if (input.kind === "image") row.image_url = input.imageUrl;
    if (input.kind === "place") { row.lat = input.lat; row.lng = input.lng; }
    if (input.kind === "list") {
      row.payload = {
        items: input.items.map((text, i) => ({
          id: `${Date.now()}-${i}`,
          text,
          checkedBy: null,
        })),
      };
    }

    const { data, error } = await supabase()
      .from("messages")
      .insert(row)
      .select("*, sender:profiles!messages_sender_id_fkey(display_name, avatar_url)")
      .single();
    fail(error);

    return toMessage(data);
  }

  async toggleListItem(messageId: Uuid, itemId: string): Promise<Message> {
    const me = await currentUserId();

    const { data: current, error: readError } = await supabase()
      .from("messages")
      .select("payload")
      .eq("id", messageId)
      .single<{ payload: { items: ListItem[] } }>();
    fail(readError);

    const items = (current?.payload.items ?? []).map((item) =>
      item.id === itemId
        ? { ...item, checkedBy: item.checkedBy === me ? null : me }
        : item,
    );

    const { data, error } = await supabase()
      .from("messages")
      .update({ payload: { items } })
      .eq("id", messageId)
      .select("*, sender:profiles!messages_sender_id_fkey(display_name, avatar_url)")
      .single();
    fail(error);

    return toMessage(data);
  }

  async markThreadRead(threadId: Uuid): Promise<void> {
    const me = await currentUserId();
    await supabase()
      .from("thread_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .eq("user_id", me);
  }

  async ensureDirectThread(userId: Uuid): Promise<Uuid> {
    const { data, error } = await supabase().rpc("ensure_direct_thread", { p_other: userId });
    fail(error);
    return data as string;
  }

  subscribeToThread(threadId: Uuid, onMessage: (message: Message) => void): () => void {
    const channel = supabase()
      .channel(`thread:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const row = payload.new as Parameters<typeof toMessage>[0];
          // Realtime skickar bara raden; avsändarnamnet får hämtas separat.
          if (row.sender_id) {
            const { data } = await supabase()
              .from("public_profiles")
              .select("display_name, avatar_url")
              .eq("id", row.sender_id)
              .maybeSingle<{ display_name: string; avatar_url: string }>();
            if (data) row.sender = data;
          }
          onMessage(toMessage(row));
        },
      )
      .subscribe();

    return () => { void supabase().removeChannel(channel); };
  }

  /* Göra om det? ---------------------------------------------------------- */

  async rematchPrompts(): Promise<RematchPrompt[]> {
    const { data, error } = await supabase().rpc("rematch_prompts");
    fail(error);

    return (data ?? []).map((row: {
      activity_id: string; activity_title: string; ends_at: string;
      user_id: string; display_name: string; avatar_url: string;
    }) => ({
      activityId: row.activity_id,
      activityTitle: row.activity_title,
      endsAt: row.ends_at,
      userId: row.user_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    }));
  }

  async submitRematch(activityId: Uuid, userId: Uuid, wantsAgain: boolean): Promise<void> {
    const { error } = await supabase().rpc("submit_rematch", {
      p_activity_id: activityId,
      p_to_user: userId,
      p_wants_again: wantsAgain,
    });
    fail(error);
  }

  async rematches(): Promise<Rematch[]> {
    // rematches() i databasen släpper bara igenom dubbla ja. Klienten får
    // därför aldrig se ett ensidigt svar och kan inte råka avslöja ett nej.
    const { data, error } = await supabase().rpc("rematches");
    fail(error);

    return (data ?? []).map((row: {
      user_id: string; display_name: string; avatar_url: string;
      home_area_label: string | null; activity_id: string;
      activity_title: string; matched_at: string;
    }) => ({
      userId: row.user_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      homeAreaLabel: row.home_area_label,
      activityId: row.activity_id,
      activityTitle: row.activity_title,
      matchedAt: row.matched_at,
    }));
  }

  async acknowledgeRematch(activityId: Uuid, userId: Uuid): Promise<void> {
    const { error } = await supabase().rpc("acknowledge_rematch", {
      p_activity_id: activityId,
      p_other: userId,
    });
    fail(error);
  }

  /* kompis ------------------------------------------------------------------- */

  async listFriends(): Promise<PublicProfile[]> {
    const me = await currentUserId();

    const { data, error } = await supabase()
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${me},addressee_id.eq.${me}`);
    fail(error);

    const ids = (data ?? []).map((f) => (f.requester_id === me ? f.addressee_id : f.requester_id));
    if (ids.length === 0) return [];

    const { data: profiles } = await supabase()
      .from("public_profiles")
      .select("*")
      .in("id", ids)
      .order("display_name");

    return (profiles ?? []).map((p) => ({
      ...toPublicProfile(p as ProfileRow, undefined, me),
      friendStatus: "accepted" as const,
    }));
  }

  async listFriendRequests(): Promise<FriendRequest[]> {
    const me = await currentUserId();

    const { data, error } = await supabase()
      .from("friendships")
      .select("id, requester_id, addressee_id, created_at")
      .eq("status", "pending")
      .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
      .order("created_at", { ascending: false });
    fail(error);

    const rows = data ?? [];
    if (rows.length === 0) return [];

    const otherIds = rows.map((f) => (f.requester_id === me ? f.addressee_id : f.requester_id));
    const { data: profiles } = await supabase()
      .from("public_profiles").select("*").in("id", otherIds);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p as ProfileRow]));

    return rows.flatMap((f) => {
      const otherId = f.requester_id === me ? f.addressee_id : f.requester_id;
      const profile = byId.get(otherId);
      if (!profile) return [];
      return [{
        friendshipId: f.id,
        profile: toPublicProfile(profile, undefined, me),
        createdAt: f.created_at,
        incoming: f.addressee_id === me,
      }];
    });
  }

  async requestFriend(userId: Uuid): Promise<void> {
    const { error } = await supabase().rpc("request_friend", { p_other: userId });
    fail(error);
  }

  async respondFriend(friendshipId: Uuid, accept: boolean): Promise<void> {
    const { error } = await supabase()
      .rpc("respond_friend", { p_friendship_id: friendshipId, p_accept: accept });
    fail(error);
  }

  async removeFriend(friendshipId: Uuid): Promise<void> {
    const { error } = await supabase().from("friendships").delete().eq("id", friendshipId);
    fail(error);
  }

  /* Trygghet -------------------------------------------------------------- */

  async blockUser(userId: Uuid): Promise<void> {
    const me = await currentUserId();
    const { error } = await supabase()
      .from("blocks")
      .insert({ blocker_id: me, blocked_id: userId });
    fail(error);
  }

  async reportUser(userId: Uuid, reason: string, details?: string): Promise<void> {
    const me = await currentUserId();
    const { error } = await supabase().from("reports").insert({
      reporter_id: me,
      reported_user_id: userId,
      reason,
      details: details ?? null,
    });
    fail(error);
  }

  /* Bilder ---------------------------------------------------------------- */

  async uploadImage(
    bucket: ImageBucket,
    localUri: string,
    pathPrefix?: string,
  ): Promise<string> {
    const me = await currentUserId();

    // Sökvägen måste börja med ägarens uuid, storage-policyerna läser första
    // mappnivån för att avgöra vem som får skriva. Chattbilder är tråd först,
    // avsändare sedan.
    const folder = pathPrefix ? `${pathPrefix}/${me}` : me;
    const extension = localUri.split(".").pop()?.split("?")[0] ?? "jpg";
    const path = `${folder}/${Date.now()}.${extension}`;

    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: "base64" });
    const bytes = decodeBase64(base64);

    const { error } = await supabase().storage.from(bucket).upload(path, bytes, {
      contentType: extension === "png" ? "image/png" : "image/jpeg",
      upsert: false,
    });
    fail(error);

    if (bucket === "chat-images") {
      // Privat hink, en signerad länk som håller ett dygn.
      const { data } = await supabase().storage.from(bucket)
        .createSignedUrl(path, 86_400);
      return data?.signedUrl ?? path;
    }

    return supabase().storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
}

function describeKind(kind: Message["kind"], body: string | null): string {
  switch (kind) {
    case "image": return "Bild";
    case "place": return body ?? "Plats";
    case "list":  return body ?? "Lista";
    default:      return body ?? "";
  }
}

/** base64 -> bytes. React Native saknar Buffer, och atob ger en teckensträng. */
function decodeBase64(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
