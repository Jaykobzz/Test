/**
 * Mina aktiviteter — det du är värd för och det du hakat på.
 *
 * Sådant som varit ligger kvar under "Varit". Chatten finns kvar där, och
 * därifrån går det att göra om samma sak med samma folk — det är så en
 * engångsträff blir en vana.
 */

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";

import { getBackend } from "@/api";
import type { ActivityCard } from "@/api/types";
import { ActivityListItem } from "@/components/ActivityListItem";
import { Chip, EmptyState, Gap, Loading, Row, Screen, Txt } from "@/components/ui";
import { space } from "@/theme";

type Tab = "hosting" | "joined";

export default function MyActivitiesScreen() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("joined");
  const [hosting, setHosting] = useState<ActivityCard[]>([]);
  const [joined, setJoined] = useState<ActivityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const mine = await getBackend().myActivities();
      setHosting(mine.hosting);
      setJoined(mine.joined);
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
