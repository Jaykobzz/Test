/**
 * Chatten.
 *
 * Fyra sorters meddelanden: text, bild, plats och lista. De tre sista finns
 * för att det är dem man faktiskt behöver inför något man ska göra ihop —
 * "här är bryggan", "här är vad vi ska ta med".
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";

import { getBackend } from "@/api";
import type { Message, ThreadSummary } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";
import { Avatar, Gap, IconButton, Loading, Row, Screen, Txt } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { mapsUrl } from "@/lib/geo";
import { pickImage } from "@/lib/image";
import { getCurrentPlace } from "@/lib/location";
import { formatChatDivider, formatTime } from "@/lib/time";
import { font, radius, space } from "@/theme";

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [thread, setThread] = useState<ThreadSummary | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showTools, setShowTools] = useState(false);

  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [loaded, threads] = await Promise.all([
        getBackend().listMessages(id),
        getBackend().listThreads(),
      ]);
      setMessages(loaded);
      setThread(threads.find((t) => t.id === id) ?? null);
      await getBackend().markThreadRead(id);
    } catch (error) {
      Alert.alert("Kunde inte öppna chatten", describe(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  // Nya meddelanden trillar in utan att man behöver dra för att uppdatera.
  useEffect(() => {
    if (!id) return;
    return getBackend().subscribeToThread(id, (message) => {
      setMessages((current) =>
        current.some((m) => m.id === message.id)
          ? current.map((m) => (m.id === message.id ? message : m))
          : [...current, message],
      );
    });
  }, [id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: thread?.title ?? "",
      headerRight: () =>
        thread?.activityId ? (
          <IconButton
            icon="information-circle-outline"
            label="Om aktiviteten"
            onPress={() => router.push(`/aktivitet/${thread.activityId}`)}
          />
        ) : null,
    });
  }, [navigation, thread, router]);

  async function send() {
    const body = draft.trim();
    if (!body || !id) return;

    setDraft("");
    setSending(true);
    try {
      await getBackend().sendMessage(id, { kind: "text", body });
    } catch (error) {
      setDraft(body); // Lägg tillbaka texten så att den inte går förlorad.
      Alert.alert("Kunde inte skicka", describe(error));
    } finally {
      setSending(false);
    }
  }

  async function sendImage() {
    if (!id) return;
    setShowTools(false);
    try {
      const uri = await pickImage("chat-images");
      if (!uri) return;
      const url = await getBackend().uploadImage("chat-images", uri, id);
      await getBackend().sendMessage(id, { kind: "image", imageUrl: url });
    } catch (error) {
      Alert.alert("Kunde inte skicka bilden", describe(error));
    }
  }

  async function sendPlace() {
    if (!id) return;
    setShowTools(false);
    try {
      const place = await getCurrentPlace();
      await getBackend().sendMessage(id, {
        kind: "place",
        lat: place.lat,
        lng: place.lng,
        body: place.label,
      });
    } catch (error) {
      Alert.alert("Kunde inte dela platsen", describe(error));
    }
  }

  function sendList() {
    setShowTools(false);
    Alert.prompt?.(
      "Ny lista",
      "En sak per rad.",
      async (text) => {
        if (!text?.trim() || !id) return;
        const items = text.split("\n").map((s) => s.trim()).filter(Boolean);
        if (items.length === 0) return;
        try {
          await getBackend().sendMessage(id, { kind: "list", body: "Att ta med", items });
        } catch (error) {
          Alert.alert("Kunde inte skapa listan", describe(error));
        }
      },
      "plain-text",
      "",
    );

    // Alert.prompt finns bara på iOS. På Android går listan via textfältet.
    if (Platform.OS !== "ios") {
      Alert.alert(
        "Ny lista",
        "Skriv punkterna i textfältet, en per rad, och tryck på listknappen igen.",
      );
    }
  }

  async function toggleItem(messageId: string, itemId: string) {
    try {
      const updated = await getBackend().toggleListItem(messageId, itemId);
      setMessages((current) => current.map((m) => (m.id === updated.id ? updated : m)));
    } catch (error) {
      Alert.alert("Gick inte", describe(error));
    }
  }

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 92 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ paddingTop: space.xxxl, alignItems: "center" }}>
              <Txt variant="body" tone="faint" align="center">
                Säg hej. Det brukar räcka.
              </Txt>
            </View>
          }
          renderItem={({ item, index }) => {
            const previous = messages[index - 1];
            const newDay =
              !previous ||
              new Date(previous.createdAt).toDateString()
                !== new Date(item.createdAt).toDateString();

            return (
              <>
                {newDay && <DayDivider iso={item.createdAt} />}
                <MessageBubble
                  message={item}
                  isMine={item.senderId === profile?.id}
                  showSender={
                    (thread?.memberCount ?? 0) > 2 &&
                    item.senderId !== profile?.id &&
                    previous?.senderId !== item.senderId
                  }
                  onToggleItem={(itemId) => toggleItem(item.id, itemId)}
                  onOpenProfile={() =>
                    item.senderId && router.push(`/person/${item.senderId}`)
                  }
                />
              </>
            );
          }}
        />

        {showTools && (
          <Row
            gap="md"
            justify="space-around"
            style={{
              paddingVertical: space.md,
              paddingHorizontal: space.lg,
              backgroundColor: theme.color.surface,
            }}
          >
            <Tool icon="image" label="Bild" onPress={sendImage} />
            <Tool icon="location" label="Plats" onPress={sendPlace} />
            <Tool icon="list" label="Lista" onPress={sendList} />
          </Row>
        )}

        <Row
          gap="sm"
          align="flex-end"
          style={{
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            backgroundColor: theme.color.surface,
            borderTopWidth: 1,
            borderTopColor: theme.color.border,
          }}
        >
          <IconButton
            icon={showTools ? "close" : "add-circle"}
            label={showTools ? "Stäng" : "Bifoga"}
            tone="primary"
            onPress={() => setShowTools((v) => !v)}
          />

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Skriv något …"
            placeholderTextColor={theme.color.textFaint}
            multiline
            style={[
              font.body,
              {
                flex: 1,
                color: theme.color.text,
                backgroundColor: theme.color.surfaceAlt,
                borderRadius: radius.lg,
                paddingHorizontal: space.md,
                paddingTop: 10,
                paddingBottom: 10,
                maxHeight: 120,
              },
            ]}
          />

          <Pressable
            onPress={send}
            disabled={!draft.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Skicka"
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: draft.trim() ? theme.color.primary : theme.color.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={draft.trim() ? theme.color.onPrimary : theme.color.textFaint}
            />
          </Pressable>
        </Row>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Tool({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ alignItems: "center", gap: 5 }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: theme.color.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={22} color={theme.color.primary} />
      </View>
      <Txt variant="micro" tone="muted">{label}</Txt>
    </Pressable>
  );
}

function DayDivider({ iso }: { iso: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: space.sm }}>
      <Txt variant="micro" tone="faint">{formatChatDivider(iso)}</Txt>
    </View>
  );
}

function MessageBubble({
  message,
  isMine,
  showSender,
  onToggleItem,
  onOpenProfile,
}: {
  message: Message;
  isMine: boolean;
  showSender: boolean;
  onToggleItem: (itemId: string) => void;
  onOpenProfile: () => void;
}) {
  const theme = useTheme();

  if (message.kind === "system") {
    return (
      <View style={{ alignItems: "center", paddingVertical: space.xs }}>
        <Txt variant="micro" tone="faint">{message.body}</Txt>
      </View>
    );
  }

  const bubble = {
    maxWidth: "82%" as const,
    backgroundColor: isMine ? theme.color.primary : theme.color.surface,
    borderRadius: radius.lg,
    borderBottomRightRadius: isMine ? 4 : radius.lg,
    padding: space.md,
    gap: space.sm,
  };

  return (
    <View style={{ alignItems: isMine ? "flex-end" : "flex-start" }}>
      {showSender && (
        <Pressable onPress={onOpenProfile}>
          <Row gap="xs" style={{ marginBottom: 3, marginLeft: space.sm }}>
            <Avatar uri={message.senderAvatar} name={message.senderName ?? "?"} size={18} />
            <Txt variant="micro" tone="faint">{message.senderName}</Txt>
          </Row>
        </Pressable>
      )}

      <View style={bubble}>
        {message.kind === "image" && message.imageUrl && (
          <Image
            source={{ uri: message.imageUrl }}
            style={{
              width: 220,
              height: 165,
              borderRadius: radius.md,
              backgroundColor: theme.color.surfaceAlt,
            }}
            contentFit="cover"
          />
        )}

        {message.kind === "place" && (
          <Pressable
            onPress={() =>
              message.lat !== null && message.lng !== null &&
              Linking.openURL(mapsUrl({ lat: message.lat, lng: message.lng }, message.body ?? undefined))
            }
            accessibilityRole="link"
          >
            <Row gap="sm">
              <Ionicons
                name="location"
                size={22}
                color={isMine ? theme.color.onPrimary : theme.color.primary}
              />
              <View>
                <Txt variant="bodyStrong" tone={isMine ? "onPrimary" : "default"}>
                  {message.body ?? "Plats"}
                </Txt>
                <Txt variant="small" tone={isMine ? "onPrimary" : "muted"}>
                  Tryck för att öppna i kartor
                </Txt>
              </View>
            </Row>
          </Pressable>
        )}

        {message.kind === "list" && message.items && (
          <View style={{ gap: space.xs, minWidth: 200 }}>
            {message.body && (
              <Txt variant="smallStrong" tone={isMine ? "onPrimary" : "default"}>
                {message.body}
              </Txt>
            )}
            {message.items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onToggleItem(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.checkedBy !== null }}
              >
                <Row gap="sm">
                  <Ionicons
                    name={item.checkedBy ? "checkbox" : "square-outline"}
                    size={19}
                    color={isMine ? theme.color.onPrimary : theme.color.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Txt
                      variant="body"
                      tone={isMine ? "onPrimary" : "default"}
                      style={
                        item.checkedBy
                          ? { textDecorationLine: "line-through", opacity: 0.6 }
                          : undefined
                      }
                    >
                      {item.text}
                    </Txt>
                  </View>
                </Row>
              </Pressable>
            ))}
          </View>
        )}

        {message.kind === "text" && (
          <Txt variant="body" tone={isMine ? "onPrimary" : "default"}>
            {message.body}
          </Txt>
        )}

        <Txt variant="micro" tone={isMine ? "onPrimary" : "faint"} align="right">
          {formatTime(message.createdAt)}
        </Txt>
      </View>
      <Gap size="xs" />
    </View>
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Något gick fel.";
}
