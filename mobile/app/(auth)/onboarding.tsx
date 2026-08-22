/**
 * Onboarding i tre steg: bild, vem du är, vad du gillar.
 *
 * Bilden är först och obligatorisk. Det är den som gör att någon vågar tacka
 * ja till att träffa dig, så den kan inte hoppas över.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { getBackend } from "@/api";
import { INTERESTS } from "@/api/interests";
import { useAuth } from "@/auth/AuthContext";
import { Button, Chip, Divider, Field, Gap, Loading, Row, Screen, Txt } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { pickImage } from "@/lib/image";
import { getHomePlace } from "@/lib/location";
import { radius, space } from "@/theme";

const MIN_INTERESTS = 3;

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, refresh } = useAuth();

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [home, setHome] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [locating, setLocating] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile && !displayName) setDisplayName(profile.displayName);
  }, [profile, displayName]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const place = await getHomePlace();
        if (active) setHome({ lat: place.lat, lng: place.lng, label: place.label });
      } catch {
        // Utan position går det ändå att fortsätta; området kan sättas senare.
      } finally {
        if (active) setLocating(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (!profile) return <Loading />;

  const canSave =
    avatarUri !== null &&
    displayName.trim().length >= 2 &&
    interests.length >= MIN_INTERESTS;

  async function choosePhoto() {
    try {
      const uri = await pickImage("avatars");
      if (uri) setAvatarUri(uri);
    } catch (error) {
      Alert.alert("Kunde inte välja bild", describe(error));
    }
  }

  function toggleInterest(slug: string) {
    setInterests((current) =>
      current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug],
    );
  }

  async function save() {
    if (!canSave || !avatarUri) return;
    setSaving(true);
    try {
      const avatarUrl = await getBackend().uploadImage("avatars", avatarUri);
      await getBackend().updateMyProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        avatarUrl,
        interests,
        homeLat: home?.lat ?? null,
        homeLng: home?.lng ?? null,
        homeAreaLabel: home?.label ?? null,
      });
      await refresh();
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Kunde inte spara", describe(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <Gap size="xl" />
      <Txt variant="display">Hej{profile.displayName ? ` ${profile.displayName}` : ""}!</Txt>
      <Gap size="xs" />
      <Txt variant="body" tone="muted">
        Tre snabba saker, sen är du igång.
      </Txt>

      <Gap size="xl" />

      {/* 1. Bilden */}
      <Txt variant="heading">1. En bild på dig</Txt>
      <Gap size="xs" />
      <Txt variant="small" tone="muted">
        Alla på FRIEND visar sitt ansikte. Det är därför det känns tryggt att tacka ja.
      </Txt>
      <Gap size="md" />

      <Pressable onPress={choosePhoto} accessibilityRole="button" accessibilityLabel="Välj profilbild">
        <View style={{ alignItems: "center" }}>
          {avatarUri ? (
            <View>
              <Image
                source={{ uri: avatarUri }}
                style={{ width: 132, height: 132, borderRadius: 66 }}
                contentFit="cover"
              />
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  backgroundColor: theme.color.primary,
                  borderRadius: radius.pill,
                  padding: 9,
                }}
              >
                <Ionicons name="pencil" size={15} color={theme.color.onPrimary} />
              </View>
            </View>
          ) : (
            <View
              style={{
                width: 132,
                height: 132,
                borderRadius: 66,
                backgroundColor: theme.color.primarySoft,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Ionicons name="camera" size={30} color={theme.color.primary} />
              <Txt variant="micro" tone="primary">VÄLJ BILD</Txt>
            </View>
          )}
        </View>
      </Pressable>

      <Gap size="xl" />
      <Divider />

      {/* 2. Vem du är */}
      <Txt variant="heading">2. Vem är du?</Txt>
      <Gap size="md" />

      <Field
        label="Vad ska folk kalla dig?"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Förnamn räcker"
        maxLength={40}
      />
      <Gap size="md" />
      <Field
        label="Kort om dig"
        value={bio}
        onChangeText={setBio}
        placeholder="Vad gör du helst en ledig lördag?"
        multiline
        maxLength={500}
        hint={`${bio.length}/500`}
      />

      <Gap size="md" />

      <View
        style={{
          backgroundColor: theme.color.surfaceAlt,
          borderRadius: radius.md,
          padding: space.md,
        }}
      >
        <Row gap="sm">
          <Ionicons name="location" size={17} color={theme.color.accent} />
          <View style={{ flex: 1 }}>
            <Txt variant="smallStrong">
              {locating ? "Letar upp ditt område …" : home?.label ?? "Område okänt"}
            </Txt>
            <Txt variant="small" tone="faint">
              Vi sparar bara ungefär var du bor — aldrig din exakta adress.
            </Txt>
          </View>
        </Row>
      </View>

      <Gap size="xl" />
      <Divider />

      {/* 3. Intressen */}
      <Txt variant="heading">3. Vad gillar du?</Txt>
      <Gap size="xs" />
      <Txt variant="small" tone="muted">
        Välj minst {MIN_INTERESTS}. De styr vad du får se i flödet.
      </Txt>
      <Gap size="md" />

      <Row gap="sm" wrap>
        {INTERESTS.map((interest) => (
          <Chip
            key={interest.slug}
            label={`${interest.emoji} ${interest.label}`}
            selected={interests.includes(interest.slug)}
            onPress={() => toggleInterest(interest.slug)}
          />
        ))}
      </Row>

      <Gap size="xl" />

      <Button
        label={saving ? "Sparar …" : "Kom igång"}
        onPress={save}
        disabled={!canSave}
        loading={saving}
      />

      {!canSave && (
        <>
          <Gap size="sm" />
          <Txt variant="small" tone="faint" align="center">
            {!avatarUri
              ? "Välj en bild för att fortsätta."
              : displayName.trim().length < 2
                ? "Skriv vad du vill kallas."
                : `Välj ${MIN_INTERESTS - interests.length} intressen till.`}
          </Txt>
        </>
      )}
    </Screen>
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Något gick fel.";
}
