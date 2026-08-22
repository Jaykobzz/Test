/**
 * Mina aktiviteter, det du är värd för och det du hakat på.
 *
 * Sådant som varit ligger kvar under "Varit". Chatten finns kvar där, och
 * därifrån går det att göra om samma sak med samma folk, det är så en
 * engångsträff blir en vana.
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";

import { getBackend } from "@/api";
import type { ActivityCard, Rematch, RematchPrompt } from "@/api/types";
import { ActivityListItem } from "@/components/ActivityListItem";
import {
  Avatar, Button, Card, Chip, EmptyState, Gap, Loading, Row, Screen, Txt,
} from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme";

type Tab = "hosting" | "joined";

export default function MyActivitiesScreen() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("joined");
  const [hosting, setHosting] = useState<ActivityCard[]>([]);
  const [joined, setJoined] = useState<ActivityCard[]>([]);
  const [prompts, setPrompts] = useState<RematchPrompt[]>([]);
  const [matches, setMatches] = useState<Rematch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [mine, pending, mutual] = await Promise.all([
        getBackend().myActivities(),
        getBackend().rematchPrompts(),
        getBackend().rematches(),
      ]);
      setHosting(mine.hosting);
      setJoined(mine.joined);
      setPrompts(pending);
      setMatches(mutual);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <Screen><Loading /></Screen>;

  const list = tab === "hosting" ? hosting : joined;
  const upcoming = list.filter((a) => a.status === "open" || a.status === "full");
  const past = list.filter((a) => a.status !== "open" && a.status !== "full");

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>
        <Txt variant="title">Mina aktiviteter</Txt>
        <Gap size="md" />
        <Row gap="sm">
          <Chip
            label={`Jag är med (${joined.length})`}
            selected={tab === "joined"}
            onPress={() => setTab("joined")}
          />
          <Chip
            label={`Jag är värd (${hosting.length})`}
            selected={tab === "hosting"}
            onPress={() => setTab("hosting")}
          />
        </Row>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: space.xxxl,
          gap: space.md,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void load(); }}
          />
        }
      >
        {matches.map((match) => (
          <MatchCard
            key={`${match.activityId}-${match.userId}`}
            match={match}
            onDone={load}
          />
        ))}

        {groupPrompts(prompts).map((group) => (
          <RematchPromptCard
            key={group.activityId}
            group={group}
            onPress={() => router.push(`/igen/${group.activityId}`)}
          />
        ))}

        {upcoming.length === 0 && past.length === 0 && (
          <EmptyState
            icon="calendar-outline"
            title={tab === "hosting" ? "Du är inte värd för något än" : "Du har inte hakat på något än"}
            body={
              tab === "hosting"
                ? "Lägg upp något du ändå ska göra. Fiska, springa, spela, folk hakar på."
                : "Kika i Upptäck och ansök om något som ser kul ut."
            }
            action={{
              label: tab === "hosting" ? "Skapa aktivitet" : "Till Upptäck",
              onPress: () =>
                router.push(tab === "hosting" ? "/aktivitet/ny" : "/(tabs)"),
            }}
          />
        )}

        {upcoming.length > 0 && (
          <>
            <Txt variant="heading">Framåt</Txt>
            {upcoming.map((activity) => (
              <ActivityListItem
                key={activity.id}
                activity={activity}
                onPress={() => router.push(`/aktivitet/${activity.id}`)}
              />
            ))}
          </>
        )}

        {past.length > 0 && (
          <>
            <Gap size="md" />
            <Txt variant="heading">Varit</Txt>
            {past.map((activity) => (
              <ActivityListItem
                key={activity.id}
                activity={activity}
                onPress={() => router.push(`/aktivitet/${activity.id}`)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/* En rad per aktivitet, oavsett hur många man ska svara om. */
interface PromptGroup {
  activityId: string;
  activityTitle: string;
  people: RematchPrompt[];
}

function groupPrompts(prompts: RematchPrompt[]): PromptGroup[] {
  const byActivity = new Map<string, PromptGroup>();
  for (const prompt of prompts) {
    const existing = byActivity.get(prompt.activityId);
    if (existing) {
      existing.people.push(prompt);
    } else {
      byActivity.set(prompt.activityId, {
        activityId: prompt.activityId,
        activityTitle: prompt.activityTitle,
        people: [prompt],
      });
    }
  }
  return [...byActivity.values()];
}

/**
 * Frågan efter en genomförd aktivitet.
 *
 * Formulerad kring aktiviteten, inte kring personen, appens jobb är att få
 * folk att göra saker ihop, och "vill du göra det igen" är en mycket lättare
 * fråga att svara ärligt på än "vill du bli kompis".
 */
function RematchPromptCard({
  group,
  onPress,
}: {
  group: PromptGroup;
  onPress: () => void;
}) {
  const names = group.people.map((p) => p.displayName);
  const who = names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(", ")} och ${names[names.length - 1]}`;

  return (
    <Card>
      <View style={{ padding: space.lg, gap: space.md }}>
        <Row gap="sm">
          {group.people.slice(0, 4).map((person) => (
            <Avatar
              key={person.userId}
              uri={person.avatarUrl}
              name={person.displayName}
              size={34}
            />
          ))}
        </Row>

        <View>
          <Txt variant="heading">Göra om {group.activityTitle.toLowerCase()}?</Txt>
          <Gap size="xs" />
          <Txt variant="small" tone="muted">
            Skulle du vilja göra det igen med {who}? Svaret är privat.
          </Txt>
        </View>

        <Button label="Svara" icon="repeat" onPress={onPress} />
      </View>
    </Card>
  );
}

/**
 * Ett dubbelt ja.
 *
 * Dyker bara upp när båda svarat ja, så det finns ingen risk att det här
 * kortet berättar något om ett nej. Primär åtgärd är att göra något nytt:
 * inte att bli vänner. Vänskapen är det som händer om det upprepas.
 */
function MatchCard({ match, onDone }: { match: Rematch; onDone: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const [working, setWorking] = useState(false);

  async function openChat() {
    setWorking(true);
    try {
      const threadId = await getBackend().ensureDirectThread(match.userId);
      await getBackend().acknowledgeRematch(match.activityId, match.userId);
      router.push(`/chatt/${threadId}`);
      onDone();
    } catch (error) {
      Alert.alert("Gick inte", describe(error));
    } finally {
      setWorking(false);
    }
  }

  async function dismiss() {
    await getBackend().acknowledgeRematch(match.activityId, match.userId);
    onDone();
  }

  return (
    <Card>
      <View
        style={{
          backgroundColor: theme.color.primarySoft,
          padding: space.lg,
          gap: space.md,
        }}
      >
        <Row gap="md">
          <Avatar uri={match.avatarUrl} name={match.displayName} size={48} />
          <View style={{ flex: 1 }}>
            <Row gap="xs">
              <Ionicons name="repeat" size={15} color={theme.color.accent} />
              <Txt variant="micro" tone="muted">NI VILL BÅDA</Txt>
            </Row>
            <Gap size="xs" />
            <Txt variant="heading">
              Du och {match.displayName} vill göra om det
            </Txt>
            <Txt variant="small" tone="muted">{match.activityTitle}</Txt>
          </View>
        </Row>

        <Row gap="sm">
          <View style={{ flex: 1 }}>
            <Button
              label="Boka in nästa"
              icon="chatbubble"
              onPress={openChat}
              loading={working}
            />
          </View>
          <Button
            label="Senare"
            kind="secondary"
            onPress={dismiss}
            fullWidth={false}
          />
        </Row>

        <Txt variant="small" tone="faint">
          Vill ni fortsätta ses kan ni bli vänner på {match.displayName}s profil:
          då ser ni varandras privata aktiviteter.
        </Txt>
      </View>
    </Card>
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Något gick fel.";
}
