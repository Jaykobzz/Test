/**
 * Upptäck — flödet med aktiviteter i närheten.
 *
 * Sorterat på när det händer, inte på hur nära det är: det är lättare att ta
 * sig lite längre bort än att flytta på en tid man redan har bokat.
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";

import { getBackend } from "@/api";
import { INTERESTS } from "@/api/interests";
import type { ActivityCard } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";
import { ActivityListItem } from "@/components/ActivityListItem";
import { Chip, EmptyState, Gap, Loading, Row, Screen, Txt } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { getCurrentPlace } from "@/lib/location";
import { radius, space } from "@/theme";

/** Radier man kan välja mellan, i meter. */
const RADII = [
  { label: "2 km", value: 2_000 },
  { label: "5 km", value: 5_000 },
  { label: "15 km", value: 15_000 },
  { label: "50 km", value: 50_000 },
];

export default function DiscoverScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAuth();

  const [place, setPlace] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [radiusM, setRadiusM] = useState(15_000);
  const [filter, setFilter] = useState<string[]>([]);
  const [activities, setActivities] = useState<ActivityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Positionen hämtas en gång; profilens hemområde används som reserv.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const current = await getCurrentPlace();
        if (active) setPlace({ lat: current.lat, lng: current.lng, label: current.label });
      } catch {
        if (active && profile?.homeLat && profile.homeLng) {
          setPlace({
            lat: profile.homeLat,
            lng: profile.homeLng,
            label: profile.homeAreaLabel ?? "Ditt område",
          });
        }
      }
    })();
    return () => { active = false; };
  }, [profile]);

  const load = useCallback(async () => {
    if (!place) return;
    try {
      const result = await getBackend().discover({
        lat: place.lat,
        lng: place.lng,
        radiusM,
        interests: filter.length ? filter : undefined,
      });
      setActivities(result);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [place, radiusM, filter]);

  useEffect(() => { void load(); }, [load]);

  // Flödet ska vara aktuellt när man kommer tillbaka från en aktivitet.
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function toggleFilter(slug: string) {
    setFilter((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );
  }

  // Bara intressen som faktiskt förekommer i flödet är värda att filtrera på.
  const availableFilters = INTERESTS.filter(
    (i) => filter.includes(i.slug) || activities.some((a) => a.category === i.slug),
  );

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>
        <Row justify="space-between">
          <View>
            <Txt variant="title">Upptäck</Txt>
            {place && (
              <Row gap="xs">
                <Ionicons name="location" size={13} color={theme.color.textFaint} />
                <Txt variant="small" tone="faint">
                  {place.label} · {RADII.find((r) => r.value === radiusM)?.label}
                </Txt>
              </Row>
            )}
          </View>

          <Pressable
            onPress={() => router.push("/aktivitet/ny")}
            accessibilityRole="button"
            accessibilityLabel="Skapa aktivitet"
            style={({ pressed }) => ({
              backgroundColor: theme.color.primary,
              borderRadius: radius.pill,
              paddingVertical: 10,
              paddingHorizontal: space.lg,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Ionicons name="add" size={17} color={theme.color.onPrimary} />
            <Txt variant="smallStrong" tone="onPrimary">Skapa</Txt>
          </Pressable>
        </Row>
      </View>

      <Gap size="md" />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}
        data={RADII}
        keyExtractor={(item) => String(item.value)}
        renderItem={({ item }) => (
          <Chip
            label={item.label}
            selected={radiusM === item.value}
            onPress={() => setRadiusM(item.value)}
          />
        )}
      />

      {availableFilters.length > 0 && (
        <>
          <Gap size="sm" />
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}
            data={availableFilters}
            keyExtractor={(item) => item.slug}
            renderItem={({ item }) => (
              <Chip
                label={`${item.emoji} ${item.label}`}
                selected={filter.includes(item.slug)}
                onPress={() => toggleFilter(item.slug)}
              />
            )}
          />
        </>
      )}

      <Gap size="md" />

      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingBottom: space.xxxl,
            gap: space.md,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={theme.color.primary}
            />
          }
          renderItem={({ item }) => (
            <ActivityListItem
              activity={item}
              onPress={() => router.push(`/aktivitet/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="compass-outline"
              title="Tomt här just nu"
              body={
                filter.length
                  ? "Inga aktiviteter matchar filtret. Prova att ta bort något."
                  : "Ingen har lagt upp något i närheten än. Bli den första — det brukar räcka med en."
              }
              action={{
                label: filter.length ? "Rensa filter" : "Skapa aktivitet",
                onPress: () => (filter.length ? setFilter([]) : router.push("/aktivitet/ny")),
              }}
            />
          }
        />
      )}
    </Screen>
  );
}
