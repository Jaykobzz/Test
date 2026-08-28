/**
 * Onboarding i tre steg: bild, vem du är, vad du gillar.
 *
 * Bilden är först och obligatorisk. Det är den som gör att någon vågar tacka
 * ja till att träffa dig, så den kan inte hoppas över.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { getBackend } from "@/api";
import { INTERESTS, type IconName } from "@/api/interests";
import { useAuth } from "@/auth/AuthContext";
import { t } from "@/i18n";
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
  const [triedToSave, setTriedToSave] = useState(false);

  /*
    Namnet från BankID fylls i en enda gång.

    Tidigare låg displayName både i villkoret och i beroendelistan, vilket
    gjorde att effekten kördes om i samma stund som fältet blev tomt och
    genast skrev tillbaka namnet. Det gick alltså inte att sudda, bara att
    skriva om utan att någonsin passera tomt. Vakten nedan gör att den fyller
    i vid första profilen och sedan aldrig mer.
  */
  const prefilled = useRef(false);
  useEffect(() => {
    if (profile && !prefilled.current) {
      prefilled.current = true;
      setDisplayName(profile.displayName);
    }
  }, [profile]);

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

  /** Vad som fattas, eller null när allt är klart. En rad, inte en lista. */
  const missing =
    avatarUri === null
      ? t.onboarding.needPhoto
      : displayName.trim().length < 2
        ? t.onboarding.needName
        : interests.length < MIN_INTERESTS
          ? t.onboarding.needInterests(MIN_INTERESTS - interests.length)
          : null;

  const canSave = missing === null;

  async function choosePhoto() {
    try {
      const uri = await pickImage("avatars");
      if (uri) setAvatarUri(uri);
    } catch (error) {
      Alert.alert(t.onboarding.photoFailed, describe(error));
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
    if (!canSave || !avatarUri) {
      // En avstängd knapp ger ingen återkoppling alls. En rad finstilt text
      // ovanför den är nästan lika illa: den syns inte när man tittar på
      // knappen man just tryckt på. Därför en ruta man måste stänga.
      setTriedToSave(true);
      Alert.alert(t.common.missing, missing ?? t.onboarding.needAll);
      return;
    }
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
      Alert.alert(t.onboarding.saveFailed, describe(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      scroll
      footer={
        <>
          {missing && (
            <>
              <Txt
                variant="small"
                tone={triedToSave ? "danger" : "faint"}
                align="center"
              >
                {missing}
              </Txt>
              <Gap size="sm" />
            </>
          )}
          <Button
            label={saving ? t.onboarding.saving : t.onboarding.start}
            onPress={save}
            loading={saving}
          />
        </>
      }
    >
      <Gap size="xl" />
      <Txt variant="display">{t.onboarding.welcome}</Txt>
      <Gap size="xs" />
      <Txt variant="body" tone="muted">
        {t.onboarding.intro}
      </Txt>

      <Gap size="xl" />

      {/* 1. Bilden */}
      <StepTitle n={1} label={t.onboarding.photo} done={avatarUri !== null} />
      <Gap size="xs" />
      <Txt variant="small" tone="muted">
        {t.onboarding.photoWhy}
      </Txt>
      <Gap size="md" />

      <Pressable onPress={choosePhoto} accessibilityRole="button" accessibilityLabel={t.onboarding.choosePhoto}>
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
              <Txt variant="micro" tone="primary">{t.onboarding.pickPhoto}</Txt>
            </View>
          )}
        </View>
      </Pressable>

      <Gap size="xl" />
      <Divider />

      {/* 2. Vem du är */}
      <StepTitle n={2} label={t.onboarding.who} done={displayName.trim().length >= 2} />
      <Gap size="md" />

      <Field
        label={t.onboarding.nameLabel}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder={t.onboarding.namePlaceholder}
        maxLength={40}
      />
      <Gap size="md" />
      <Field
        label={t.onboarding.bioLabel}
        value={bio}
        onChangeText={setBio}
        placeholder={t.onboarding.bioPlaceholder}
        multiline
        maxLength={500}
        hint={`${bio.length}/500`}
      />

      <Gap size="md" />

      <View
        style={{
          backgroundColor: theme.color.surfaceAlt,
          borderRadius: radius.field,
          padding: space.md,
        }}
      >
        <Row gap="sm">
          <Ionicons name="location" size={17} color={theme.color.accent} />
          <View style={{ flex: 1 }}>
            <Txt variant="smallStrong">
              {locating ? t.onboarding.locating : home?.label ?? t.onboarding.areaUnknown}
            </Txt>
            <Txt variant="small" tone="faint">
              {t.onboarding.areaPrivacy}
            </Txt>
          </View>
        </Row>
      </View>

      <Gap size="xl" />
      <Divider />

      {/* 3. Intressen */}
      <StepTitle
        n={3}
        label={t.onboarding.interests}
        done={interests.length >= MIN_INTERESTS}
      />
      <Gap size="xs" />
      <Txt variant="small" tone="muted">
        {t.onboarding.interestsHelp(MIN_INTERESTS)}
      </Txt>
      <Gap size="md" />

      <Row gap="sm" wrap>
        {INTERESTS.map((interest) => (
          <Chip
            key={interest.slug}
            label={interest.label}
            icon={interest.icon as IconName}
            selected={interests.includes(interest.slug)}
            onPress={() => toggleInterest(interest.slug)}
          />
        ))}
      </Row>

      <Gap size="xl" />

    </Screen>
  );
}

/**
 * Rubrik som visar om steget är klart.
 *
 * Poängen är att svaret på "varför händer inget" ska gå att se innan man
 * trycker, inte bara efteråt.
 */
function StepTitle({ n, label, done }: { n: number; label: string; done: boolean }) {
  const theme = useTheme();
  return (
    <Row gap="sm">
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: done ? theme.color.primary : theme.color.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done ? (
          <Ionicons name="checkmark" size={13} color={theme.color.onPrimary} />
        ) : (
          <Txt variant="micro" tone="faint">{n}</Txt>
        )}
      </View>
      <Txt variant="heading">{label}</Txt>
    </Row>
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : t.common.somethingWrong;
}
