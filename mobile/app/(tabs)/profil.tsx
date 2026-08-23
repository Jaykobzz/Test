/**
 * Din egen profil.
 *
 * Stjärnorna visas som ett snitt, aldrig som en lista över vem som satt vad.
 * Det är samma regel som i databasen: den som betygsätts ska inte kunna spåra
 * en tvåa till en person och hämnas.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { USING_MOCK, getBackend, resetMockData } from "@/api";
import { INTERESTS, type IconName } from "@/api/interests";
import type { PublicProfile } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";
import {
  Avatar, Button, Card, Chip, Credentials, Divider, Field, Gap, Loading, Row, Screen, Txt,
} from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { pickImage } from "@/lib/image";
import { radius, space } from "@/theme";

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, refresh, signOut } = useAuth();

  const [editing, setEditing] = useState(false);
  const [friends, setFriends] = useState<PublicProfile[]>([]);
  const [pendingFriends, setPendingFriends] = useState(0);
  const [saving, setSaving] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftInterests, setDraftInterests] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [friends, requests] = await Promise.all([
      getBackend().listFriends(),
      getBackend().listFriendRequests(),
    ]);
    setFriends(friends);
    setPendingFriends(requests.filter((r) => r.incoming).length);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!profile) return <Screen><Loading /></Screen>;

  function startEditing() {
    if (!profile) return;
    setDraftName(profile.displayName);
    setDraftBio(profile.bio ?? "");
    setDraftInterests(profile.interests);
    setEditing(true);
  }

  async function changePhoto() {
    try {
      const uri = await pickImage("avatars");
      if (!uri) return;
      const url = await getBackend().uploadImage("avatars", uri);
      await getBackend().updateMyProfile({ avatarUrl: url });
      await refresh();
    } catch (error) {
      Alert.alert("Kunde inte byta bild", describe(error));
    }
  }

  /** Vad som fattas, eller null när allt är klart. */
  const missingInProfile =
    draftName.trim().length < 2
      ? "Skriv vad du vill kallas."
      : draftInterests.length === 0
        ? "Välj minst ett intresse."
        : null;

  async function save() {
    if (missingInProfile) {
      // En avstängd knapp säger inte varför. Det här gör det.
      Alert.alert("Något fattas", missingInProfile);
      return;
    }
    setSaving(true);
    try {
      await getBackend().updateMyProfile({
        displayName: draftName.trim(),
        bio: draftBio.trim() || null,
        interests: draftInterests,
      });
      await refresh();
      setEditing(false);
    } catch (error) {
      Alert.alert("Kunde inte spara", describe(error));
    } finally {
      setSaving(false);
    }
  }

  function confirmSignOut() {
    Alert.alert("Logga ut?", "Du loggar in igen med BankID.", [
      { text: "Avbryt", style: "cancel" },
      { text: "Logga ut", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  function confirmDelete() {
    // Två steg med flit. Det här går inte att ångra, och en enda knapptryckning
    // ska inte kunna radera allt någon byggt upp.
    Alert.alert(
      "Radera ditt konto?",
      "Din profil, dina aktiviteter och dina kompisrelationer tas bort. "
      + "Aktiviteter du är värd för ställs in så att de som tackat ja får veta. "
      + "Det går inte att ångra.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Fortsätt",
          style: "destructive",
          onPress: () => Alert.alert(
            "Säker?",
            "Kontot raderas direkt och går inte att få tillbaka.",
            [
              { text: "Nej", style: "cancel" },
              {
                text: "Radera",
                style: "destructive",
                onPress: async () => {
                  try {
                    await getBackend().deleteAccount();
                    await refresh();
                  } catch (error) {
                    Alert.alert("Gick inte att radera", describe(error));
                  }
                },
              },
            ],
          ),
        },
      ],
    );
  }

  function confirmReset() {
    Alert.alert(
      "Börja om?",
      "Allt du gjort i testläget försvinner och exempeldatan återställs.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Börja om",
          style: "destructive",
          onPress: async () => { await resetMockData(); await signOut(); },
        },
      ],
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        <View style={{ alignItems: "center" }}>
          <Pressable onPress={changePhoto} accessibilityLabel="Byt profilbild">
            <View>
              {profile.avatarUrl && profile.avatarUrl !== "pending" ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={{ width: 108, height: 108, borderRadius: 54 }}
                  contentFit="cover"
                />
              ) : (
                <Avatar uri={null} name={profile.displayName} size={108} />
              )}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  backgroundColor: theme.color.primary,
                  borderRadius: radius.pill,
                  padding: 7,
                }}
              >
                <Ionicons name="camera" size={14} color={theme.color.onPrimary} />
              </View>
            </View>
          </Pressable>

          <Gap size="md" />
          <Txt variant="title">{profile.displayName}</Txt>
          <Gap size="xs" />
          <Credentials verified={profile.bankIdVerified} />
          {profile.homeAreaLabel && (
            <>
              <Gap size="xs" />
              <Txt variant="small" tone="faint">{profile.homeAreaLabel}</Txt>
            </>
          )}
        </View>

        <Gap size="xl" />

        <Card onPress={() => router.push("/kompisar")}>
          <View style={{ padding: space.lg }}>
            <Row justify="space-between" gap="sm">
              <Row gap="md" style={{ flex: 1, minWidth: 0 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: radius.pill,
                    backgroundColor: theme.color.primarySoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="heart" size={20} color={theme.color.accent} />
                </View>
                <View>
                  <Txt variant="bodyStrong">Kompisar</Txt>
                  <Txt variant="small" tone="muted">
                    {friends.length === 0
                      ? "Inga än"
                      : friends.length === 1 ? "1 person" : `${friends.length} personer`}
                    {pendingFriends > 0 && ` · ${pendingFriends} väntar på svar`}
                  </Txt>
                </View>
              </Row>
              <Ionicons name="chevron-forward" size={19} color={theme.color.textFaint} />
            </Row>
          </View>
        </Card>

        <Gap size="lg" />

        {editing ? (
          <Card>
            <View style={{ padding: space.lg }}>
              <Field label="Namn" value={draftName} onChangeText={setDraftName} maxLength={40} />
              <Gap size="md" />
              <Field
                label="Om dig"
                value={draftBio}
                onChangeText={setDraftBio}
                multiline
                maxLength={500}
              />
              <Gap size="md" />

              <Txt variant="smallStrong" tone="muted">Intressen</Txt>
              <Gap size="sm" />
              <Row gap="sm" wrap>
                {INTERESTS.map((interest) => (
                  <Chip
                    key={interest.slug}
                    label={interest.label}
            icon={interest.icon as IconName}
                    selected={draftInterests.includes(interest.slug)}
                    onPress={() =>
                      setDraftInterests((current) =>
                        current.includes(interest.slug)
                          ? current.filter((s) => s !== interest.slug)
                          : [...current, interest.slug],
                      )
                    }
                  />
                ))}
              </Row>

              <Gap size="lg" />
              <Button label="Spara" onPress={save} loading={saving} />
              <Gap size="sm" />
              <Button label="Avbryt" kind="ghost" onPress={() => setEditing(false)} />
            </View>
          </Card>
        ) : (
          <Card>
            <View style={{ padding: space.lg }}>
              {profile.bio ? (
                <Txt variant="body">{profile.bio}</Txt>
              ) : (
                <Txt variant="body" tone="faint">
                  Skriv några rader om dig själv, det gör att fler vågar höra av sig.
                </Txt>
              )}

              <Gap size="md" />
              <Row gap="sm" wrap>
                {profile.interests.map((slug) => {
                  const interest = INTERESTS.find((i) => i.slug === slug);
                  return interest ? (
                    <Chip
                      key={slug}
                      label={interest.label}
            icon={interest.icon as IconName}
                      tone="primary"
                    />
                  ) : null;
                })}
              </Row>

              <Gap size="lg" />
              <Button label="Redigera profil" kind="secondary" onPress={startEditing} />
            </View>
          </Card>
        )}

        <Gap size="xl" />
        <Divider />

        <Button label="Logga ut" kind="ghost" onPress={confirmSignOut} />
        <Gap size="sm" />
        {/*
          Apple kräver att den som kan skapa ett konto också kan radera det
          inifrån appen. GDPR kräver samma sak av andra skäl. Den ligger sist
          och lågmält, men den ligger här.
        */}
        <Button label="Radera mitt konto" kind="danger" onPress={confirmDelete} />

        {USING_MOCK && (
          <>
            <Gap size="lg" />
            <View
              style={{
                backgroundColor: theme.color.surfaceAlt,
                borderRadius: radius.field,
                padding: space.md,
              }}
            >
              <Row gap="sm" align="flex-start">
                <Ionicons name="flask" size={17} color={theme.color.text} />
                <View style={{ flex: 1 }}>
                  <Txt variant="smallStrong">Testläge</Txt>
                  <Txt variant="small" tone="muted">
                    Appen kör mot lokal exempeldata. Inget lämnar telefonen.
                  </Txt>
                </View>
              </Row>
              <Gap size="sm" />
              <Button label="Börja om från början" kind="danger" onPress={confirmReset} />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Något gick fel.";
}
