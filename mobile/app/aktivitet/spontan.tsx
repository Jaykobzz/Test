/**
 * Spontan aktivitet.
 *
 * Egen skärm, inte ett läge i det vanliga formuläret, för de två har nästan
 * inget gemensamt. Den planerade görs i förväg och tål att ta tid. Den här
 * görs stående i hallen med jackan på, och varje fält som inte fyller en
 * funktion är ett fält som gör att posten aldrig blir av.
 *
 * Därför: inget foto, ingen beskrivning, ingen datumväljare. Ett förslag
 * fyller både titel och kategori med ett tryck, tiden är fyra chips, och
 * platsen är där du står.
 */

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, View } from "react-native";

import { getBackend } from "@/api";
import { INTERESTS } from "@/api/interests";
import type { ActivityVisibility } from "@/api/types";
import { t } from "@/i18n";
import { PriceField } from "@/components/PriceField";
import { Button, Chip, Divider, Field, Gap, Row, Screen, Txt } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { getCurrentPlace } from "@/lib/location";
import { addHours } from "@/lib/time";
import { radius, space } from "@/theme";

/** Hur långt fram en spontan aktivitet får ligga. Samma gräns som databasen. */
const WITHIN = [
  { label: t.create.now, minutes: 10 },
  { label: t.create.inMinutes(30), minutes: 30 },
  { label: t.create.inHours(1), minutes: 60 },
  { label: t.create.inHours(2), minutes: 120 },
] as const;

const LENGTHS = [
  { label: t.create.hours(1), hours: 1 },
  { label: t.create.hours(2), hours: 2 },
  { label: t.create.hours(3), hours: 3 },
] as const;

const CAPACITIES = [1, 2, 3, 4, 6] as const;

/**
 * Förslagen fyller titel och kategori på ett tryck.
 *
 * De är medvetet vardagliga. Poängen med spontant är inte att arrangera
 * något, det är att inte gå ut ensam, och då ska förslagen låta som det.
 */
const SUGGESTIONS: { title: string; category: string }[] = [
  { title: t.suggestions.fika, category: "fika" },
  { title: t.suggestions.walk, category: "vandring" },
  { title: t.suggestions.run, category: "lopning" },
  { title: t.suggestions.bike, category: "cykling" },
  { title: t.suggestions.gym, category: "gym" },
  { title: t.suggestions.lunch, category: "middag" },
  { title: t.suggestions.game, category: "bradspel" },
  { title: t.suggestions.ball, category: "fotboll" },
  { title: t.suggestions.swim, category: "bad" },
  { title: t.suggestions.photo, category: "foto" },
];

export default function SpontaneousScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number>(30);
  const [hours, setHours] = useState<number>(2);
  const [capacity, setCapacity] = useState<number | null>(3);
  const [priceSek, setPriceSek] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<ActivityVisibility>("public");
  const [locationName, setLocationName] = useState("");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const place = await getCurrentPlace();
        if (!active) return;
        setPoint({ lat: place.lat, lng: place.lng });
        setLocationName((current) => current || place.label);
      } catch {
        // Utan position får man skriva platsen själv.
      }
    })();
    return () => { active = false; };
  }, []);

  const missing =
    title.trim().length < 3
      ? t.create.needTitle
      : !point
        ? t.create.waitingForLocation
        : null;

  async function create() {
    if (missing || !point) return;
    setSaving(true);
    try {
      const startsAt = new Date(Date.now() + minutes * 60_000);
      const created = await getBackend().createActivity({
        kind: "now",
        title: title.trim(),
        category: category ?? undefined,
        coverUrl: null,
        locationName: locationName.trim() || t.create.nearby,
        lat: point.lat,
        lng: point.lng,
        startsAt: startsAt.toISOString(),
        endsAt: addHours(startsAt, hours).toISOString(),
        visibility,
        capacity,
        priceSek,
        minAge: null,
      });
      router.replace(`/aktivitet/${created.id}`);
    } catch (error) {
      Alert.alert(t.create.failed, describe(error));
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
              <Txt variant="small" tone="faint" align="center">{missing}</Txt>
              <Gap size="sm" />
            </>
          )}
          <Button
            label={saving ? t.create.posting : t.create.post}
            onPress={create}
            loading={saving}
          />
        </>
      }
    >
      <Gap size="lg" />
      <Txt variant="body" tone="muted">
        {t.create.spontaneousIntro}
      </Txt>

      <Gap size="lg" />

      <Txt variant="smallStrong" tone="muted">{t.create.what}</Txt>
      <Gap size="sm" />
      <Row gap="sm" wrap>
        {SUGGESTIONS.map((s) => (
          <Chip
            key={s.title}
            label={s.title}
            icon={INTERESTS.find((i) => i.slug === s.category)?.icon as never}
            selected={title === s.title}
            onPress={() => { setTitle(s.title); setCategory(s.category); }}
          />
        ))}
      </Row>

      <Gap size="md" />
      <Field
        label={t.create.whatOwn}
        value={title}
        onChangeText={setTitle}
        placeholder={t.create.whatPlaceholder}
        maxLength={80}
      />

      <Gap size="lg" />
      <Divider />

      <Txt variant="smallStrong" tone="muted">{t.create.when}</Txt>
      <Gap size="sm" />
      <Row gap="sm" wrap>
        {WITHIN.map((w) => (
          <Chip
            key={w.label}
            label={w.label}
            selected={minutes === w.minutes}
            onPress={() => setMinutes(w.minutes)}
          />
        ))}
      </Row>

      <Gap size="md" />
      <Txt variant="smallStrong" tone="muted">{t.create.howLong}</Txt>
      <Gap size="sm" />
      <Row gap="sm" wrap>
        {LENGTHS.map((l) => (
          <Chip
            key={l.label}
            label={l.label}
            selected={hours === l.hours}
            onPress={() => setHours(l.hours)}
          />
        ))}
      </Row>

      <Gap size="lg" />
      <Divider />

      <Field
        label={t.create.where}
        value={locationName}
        onChangeText={setLocationName}
        placeholder={t.create.whereLocating}
        maxLength={80}
      />

      <Gap size="md" />
      <Txt variant="smallStrong" tone="muted">{t.create.howMany}</Txt>
      <Gap size="sm" />
      <Row gap="sm" wrap>
        {CAPACITIES.map((c) => (
          <Chip
            key={c}
            label={String(c)}
            selected={capacity === c}
            onPress={() => setCapacity(c)}
          />
        ))}
        <Chip
          label={t.create.noLimit}
          selected={capacity === null}
          onPress={() => setCapacity(null)}
        />
      </Row>

      <Gap size="md" />
      <PriceField value={priceSek} onChange={setPriceSek} />

      <Gap size="md" />
      <Txt variant="smallStrong" tone="muted">{t.create.whoSees}</Txt>
      <Gap size="sm" />
      <Row gap="sm" wrap>
        <Chip
          label={t.create.everyone}
          selected={visibility === "public"}
          onPress={() => setVisibility("public")}
        />
        <Chip
          label={t.create.friendsOnly}
          selected={visibility === "friends"}
          onPress={() => setVisibility("friends")}
        />
      </Row>

    </Screen>
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : t.common.somethingWrong;
}
