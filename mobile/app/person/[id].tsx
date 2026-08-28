/**
 * Någon annans profil.
 *
 * Här finns kompisknappen, och här finns blockera och anmäl. De två sista ligger
 * medvetet på samma skärm som allt trevligt, man ska inte behöva leta efter
 * dem när man väl behöver dem.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { getBackend } from "@/api";
import { t } from "@/i18n";
import { INTERESTS, type IconName } from "@/api/interests";
import type { PublicProfile } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";
import {
  Button, Card, Chip, Credentials, Divider, Gap, Loading, Row, Screen, Txt,
} from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { radius, space } from "@/theme";

export default function PersonScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile: me } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [person, setPerson] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setPerson(await getBackend().getProfile(id));
    } catch (error) {
      Alert.alert(t.person.loadFailed, describe(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading || !person) return <Screen><Loading /></Screen>;

  const isMe = person.id === me?.id;

  async function requestFriend() {
    if (!person) return;
    setWorking(true);
    try {
      await getBackend().requestFriend(person.id);
      await load();
    } catch (error) {
      Alert.alert("Gick inte", describe(error));
    } finally {
      setWorking(false);
    }
  }

  function confirmRemoveFriend() {
    if (!person?.friendRequestId) return;
    Alert.alert(
      `Ta bort ${person.displayName} som kompis?`,
      t.person.removeFriendBody,
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: t.person.remove,
          style: "destructive",
          onPress: async () => {
            setWorking(true);
            try {
              await getBackend().removeFriend(person.friendRequestId!);
              await load();
            } catch (error) {
              Alert.alert("Gick inte", describe(error));
            } finally {
              setWorking(false);
            }
          },
        },
      ],
    );
  }

  async function respondFriend(accept: boolean) {
    if (!person?.friendRequestId) return;
    setWorking(true);
    try {
      await getBackend().respondFriend(person.friendRequestId, accept);
      await load();
    } catch (error) {
      Alert.alert("Gick inte", describe(error));
    } finally {
      setWorking(false);
    }
  }

  async function openChat() {
    if (!person) return;
    setWorking(true);
    try {
      const threadId = await getBackend().ensureDirectThread(person.id);
      router.push(`/chatt/${threadId}`);
    } catch (error) {
      Alert.alert(t.person.chatNotYet, describe(error));
    } finally {
      setWorking(false);
    }
  }

  function confirmBlock() {
    if (!person) return;
    Alert.alert(
      `Blockera ${person.displayName}?`,
      t.person.blockBody,
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Blockera",
          style: "destructive",
          onPress: async () => {
            try {
              await getBackend().blockUser(person.id);
              router.back();
            } catch (error) {
              Alert.alert("Gick inte", describe(error));
            }
          },
        },
      ],
    );
  }

  function report() {
    if (!person) return;
    Alert.alert(`Anmäl ${person.displayName}?`, "Vad handlar det om?", [
      { text: "Avbryt", style: "cancel" },
      { text: "Obehagligt beteende", onPress: () => submitReport("obehagligt_beteende") },
      { text: "Falsk profil", onPress: () => submitReport("falsk_profil") },
      { text: t.person.reportOther, onPress: () => submitReport("annat") },
    ]);
  }

  async function submitReport(reason: string) {
    if (!person) return;
    try {
      await getBackend().reportUser(person.id, reason);
      Alert.alert("Tack", t.person.reportThanks);
    } catch (error) {
      Alert.alert("Gick inte", describe(error));
    }
  }

  return (
    <Screen padded={false} edges={[]}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        <View style={{ alignItems: "center" }}>
          {person.avatarUrl && person.avatarUrl !== "pending" ? (
            <Image
              source={{ uri: person.avatarUrl }}
              style={{ width: 128, height: 128, borderRadius: 64 }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: 128,
                height: 128,
                borderRadius: 64,
                backgroundColor: theme.color.primarySoft,
              }}
            />
          )}

          <Gap size="md" />
          <Txt variant="title">{person.displayName}, {person.approxAge}</Txt>

          <Gap size="xs" />
          <Credentials
            verified={person.bankIdVerified}
            memberSince={person.memberSince}
          />

          {person.homeAreaLabel && (
            <>
              <Gap size="xs" />
              <Txt variant="small" tone="faint">{person.homeAreaLabel}</Txt>
            </>
          )}
        </View>

        <Gap size="xl" />

        <Row gap="sm" justify="space-around">
          <Stat value={person.activitiesHosted} label={t.person.hosted} />
          <Stat value={person.activitiesJoined} label={t.person.joined} />
          <Stat value={person.friendCount} label="kompisar" />
        </Row>

        <Gap size="xl" />

        {person.bio && (
          <>
            <Card>
              <View style={{ padding: space.lg }}>
                <Txt variant="body">{person.bio}</Txt>
              </View>
            </Card>
            <Gap size="lg" />
          </>
        )}

        {person.interests.length > 0 && (
          <>
            <Txt variant="smallStrong" tone="muted">Gillar</Txt>
            <Gap size="sm" />
            <Row gap="sm" wrap>
              {person.interests.map((slug) => {
                const interest = INTERESTS.find((i) => i.slug === slug);
                const shared = me?.interests.includes(slug) ?? false;
                return interest ? (
                  <Chip
                    key={slug}
                    label={interest.label}
            icon={interest.icon as IconName}
                    tone={shared ? "primary" : "neutral"}
                  />
                ) : null;
              })}
            </Row>
            <Gap size="xl" />
          </>
        )}

        {!isMe && (
          <>
            <FriendAction
              person={person}
              working={working}
              onRequest={requestFriend}
              onRespond={respondFriend}
              onRemove={confirmRemoveFriend}
            />

            <Gap size="sm" />
            <Button label={t.person.message} icon="chatbubble" kind="secondary" onPress={openChat} />

            <Gap size="xl" />
            <Divider />

            <Row gap="sm" justify="center">
              <Button label={t.person.report} kind="ghost" onPress={report} fullWidth={false} />
              <Button label={t.person.block} kind="ghost" onPress={confirmBlock} fullWidth={false} />
            </Row>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Txt variant="title">{value}</Txt>
      <Txt variant="small" tone="muted">{label}</Txt>
    </View>
  );
}

function FriendAction({
  person,
  working,
  onRequest,
  onRespond,
  onRemove,
}: {
  person: PublicProfile;
  working: boolean;
  onRequest: () => void;
  onRespond: (accept: boolean) => void;
  onRemove: () => void;
}) {
  const theme = useTheme();

  if (person.friendStatus === "accepted") {
    return (
      <View
        style={{
          backgroundColor: theme.color.primarySoft,
          borderRadius: radius.field,
          padding: space.md,
        }}
      >
        <Row gap="sm" justify="center">
          <Ionicons name="heart" size={17} color={theme.color.accent} />
          <Txt variant="bodyStrong">{t.person.areFriends}</Txt>
        </Row>
        <Gap size="xs" />
        <Txt variant="small" tone="muted" align="center">
          {person.displayName} ser aktiviteter du lägger upp bara för kompisar.
        </Txt>
        <Gap size="sm" />
        {/*
          Utan den här fanns bara en väg ut ur en kompisrelation, och det var
          att blockera. Att sluta vara kompis ska inte kräva det hårdaste
          verktyget appen har.
        */}
        <Button
          label={t.person.removeFriend}
          kind="ghost"
          onPress={onRemove}
          disabled={working}
        />
      </View>
    );
  }

  if (person.friendAwaitingMyAnswer) {
    return (
      <View style={{ gap: space.sm }}>
        <Txt variant="small" tone="muted" align="center">
          {person.displayName} vill bli kompis med dig.
        </Txt>
        <Row gap="sm">
          <View style={{ flex: 1 }}>
            <Button label={t.person.accept} icon="heart" onPress={() => onRespond(true)} disabled={working} />
          </View>
          <Button
            label="Nej tack"
            kind="secondary"
            onPress={() => onRespond(false)}
            disabled={working}
            fullWidth={false}
          />
        </Row>
      </View>
    );
  }

  if (person.friendStatus === "pending") {
    return (
      <Txt variant="small" tone="faint" align="center">
        Du har frågat om att bli kompis. Väntar på svar.
      </Txt>
    );
  }

  return (
    <Button
      label="Bli kompis"
      icon="heart-outline"
      onPress={onRequest}
      loading={working}
    />
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : t.common.somethingWrong;
}
