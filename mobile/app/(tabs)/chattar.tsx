/**
 * Chattlistan.
 *
 * Trådar överlever sina aktiviteter med flit, det är efter fisketuren man
 * bestämmer nästa fisketur.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";

import { getBackend } from "@/api";
import type { ThreadSummary } from "@/api/types";
import { EmptyState, Gap, Loading, Row, Screen, Txt } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { formatRelative } from "@/lib/time";
import { radius, space } from "@/theme";

export default function ChatsScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setThreads(await getBackend().listThreads());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>
        <Txt variant="title">Chattar</Txt>
      </View>
      <Gap size="md" />

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: space.xxxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void load(); }}
            tintColor={theme.color.primary}
          />
        }
        renderItem={({ item }) => (
          <ThreadRow thread={item} onPress={() => router.push(`/chatt/${item.id}`)} />
        )}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: space.lg }}>
            <EmptyState
              icon="chatbubbles-outline"
              title="Inga chattar än"
              body="När någon accepterar din ansökan, eller du accepterar någon annans, hamnar ni i en chatt här."
              action={{ label: "Hitta något att göra", onPress: () => router.push("/(tabs)") }}
            />
          </View>
        }
      />
    </Screen>
  );
}

function ThreadRow({ thread, onPress }: { thread: ThreadSummary; onPress: () => void }) {
  const theme = useTheme();
  const unread = thread.unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        backgroundColor: pressed ? theme.color.surfaceAlt : "transparent",
      })}
    >
      <Row gap="md" align="center">
        <View>
          {thread.imageUrl ? (
            <Image
              source={{ uri: thread.imageUrl }}
              style={{
                width: 52,
                height: 52,
                borderRadius: thread.kind === "direct" ? 26 : radius.field,
                backgroundColor: theme.color.surfaceAlt,
              }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: radius.field,
                backgroundColor: theme.color.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="people" size={22} color={theme.color.primary} />
            </View>
          )}

          {thread.kind === "activity" && thread.activityStatus === "completed" && (
            <View
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                backgroundColor: theme.color.surface,
                borderRadius: radius.pill,
                padding: 2,
              }}
            >
              <Ionicons name="checkmark-circle" size={16} color={theme.color.accent} />
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Row justify="space-between">
            <View style={{ flex: 1 }}>
              <Txt variant={unread ? "bodyStrong" : "body"} numberOfLines={1}>
                {thread.title}
              </Txt>
            </View>
            <Txt variant="micro" tone="faint">{formatRelative(thread.lastMessageAt)}</Txt>
          </Row>

          <Gap size="xs" />

          <Row justify="space-between" gap="sm">
            <View style={{ flex: 1 }}>
              <Txt
                variant="small"
                tone={unread ? "default" : "faint"}
                numberOfLines={1}
              >
                {thread.lastMessage ?? "Säg hej!"}
              </Txt>
            </View>

            {unread ? (
              <View
                style={{
                  minWidth: 21,
                  height: 21,
                  paddingHorizontal: 6,
                  borderRadius: radius.pill,
                  backgroundColor: theme.color.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Txt variant="micro" tone="onPrimary">{thread.unreadCount}</Txt>
              </View>
            ) : thread.kind === "activity" && thread.memberCount > 2 ? (
              <Row gap="xs">
                <Ionicons name="people" size={12} color={theme.color.textFaint} />
                <Txt variant="micro" tone="faint">{thread.memberCount}</Txt>
              </Row>
            ) : null}
          </Row>
        </View>
      </Row>
    </Pressable>
  );
}
