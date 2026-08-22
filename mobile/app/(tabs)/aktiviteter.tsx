/**
 * Mina aktiviteter — det du är värd för och det du hakat på.
 *
 * Överst ligger påminnelsen om att betygsätta. Den hamnar där för att betyg
 * är hela systemets bränsle; frågar man inte direkt efteråt får man inga.
 */

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";

import { getBackend } from "@/api";
import type { ActivityCard, RateableActivity } from "@/api/types";
import { ActivityListItem } from "@/components/ActivityListItem";
import { Avatar, Button, Card, Chip, EmptyState, Gap, Loading, Row, Screen, Txt }
  from "@/components/ui";
import { space } from "@/theme";

type Tab = "hosting" | "joined";

export default function MyActivitiesScreen() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("joined");
  const [hosting, setHosting] = useState<ActivityCard[]>([]);
  const [joined, setJoined] = useState<ActivityCard[]>([]);
  const [toRate, setToRate] = useState<RateableActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [mine, rateable] = await Promise.all([
        getBackend().myActivities(),
        getBackend().activitiesAwaitingRating(),
      ]);
      setHosting(mine.hosting);
      setJoined(mine.joined);
      setToRate(rateable);
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
        {toRate.map((activity) => (
          <RatingPrompt
            key={activity.activityId}
            activity={activity}
            onPress={() => router.push(`/betygsatt/${activity.activityId}`)}
          />
        ))}

        {upcoming.length === 0 && past.length === 0 && (
          <EmptyState
            icon="calendar-outline"
            title={tab === "hosting" ? "Du är inte värd för något än" : "Du har inte hakat på något än"}
            body={
              tab === "hosting"
                ? "Lägg upp något du ändå ska göra. Fiska, springa, spela — folk hakar på."
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

function RatingPrompt({
  activity,
  onPress,
}: {
  activity: RateableActivity;
  onPress: () => void;
}) {
  const names = activity.people.map((p) => p.displayName);
  const who = names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(", ")} och ${names[names.length - 1]}`;

  return (
    <Card>
      <View style={{ padding: space.lg, gap: space.md }}>
        <Row gap="sm">
          {activity.people.slice(0, 4).map((person) => (
            <Avatar
              key={person.userId}
              uri={person.avatarUrl}
              name={person.displayName}
              size={34}
            />
          ))}
        </Row>

        <View>
          <Txt variant="heading">Hur var {activity.title.toLowerCase()}?</Txt>
          <Gap size="xs" />
          <Txt variant="small" tone="muted">
            Sätt betyg på {who}. Det tar tio sekunder och hjälper alla andra.
          </Txt>
        </View>

        <Button label="Sätt betyg" icon="star" onPress={onPress} />
      </View>
    </Card>
  );
}
