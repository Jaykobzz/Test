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
import { PriceField } from "@/components/PriceField";
import { Button, Chip, Divider, Field, Gap, Row, Screen, Txt } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { getCurrentPlace } from "@/lib/location";
import { addHours } from "@/lib/time";
import { radius, space } from "@/theme";

/** Hur långt fram en spontan aktivitet får ligga. Samma gräns som databasen. */
const WITHIN = [
  { label: "Nu", minutes: 10 },
  { label: "Om 30 min", minutes: 30 },
  { label: "Om 1 h", minutes: 60 },
  { label: "Om 2 h", minutes: 120 },
] as const;

const LENGTHS = [
  { label: "1 h", hours: 1 },
  { label: "2 h", hours: 2 },
  { label: "3 h", hours: 3 },
] as const;

const CAPACITIES = [1, 2, 3, 4, 6] as const;

/**
 * Förslagen fyller titel och kategori på ett tryck.
 *
 * De är medvetet vardagliga. Poängen med spontant är inte att arrangera
 * något, det är att inte gå ut ensam, och då ska förslagen låta som det.
 */
const SUGGESTIONS: { title: string; category: string }[] = [
  { title: "Ta en fika", category: "fika" },
  { title: "Promenad", category: "vandring" },
  { title: "Löprunda", category: "lopning" },
  { title: "Cykla en sväng", category: "cykling" },
  { title: "Gå på gymmet", category: "gym" },
  { title: "Käka lunch", category: "middag" },
  { title: "Spela något", category: "bradspel" },
  { title: "Kasta boll", category: "fotboll" },
  { title: "Gå till badet", category: "bad" },
  { title: "Fota en runda", category: "foto" },
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
      ? "Skriv vad du vill göra."
      : !point
        ? "Väntar på din position."
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
        locationName: locationName.trim() || "I närheten",
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
      Alert.alert("Gick inte att lägga upp", describe(error));
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
            label={saving ? "Lägger upp …" : "Lägg upp"}
            onPress={create}
            loading={saving}
          />
        </>
      }
    >
      <Gap size="lg" />
      <Txt variant="body" tone="muted">
        Går ut till folk i närheten som gillar samma sak. Den försvinner av sig
        själv när den har varit.
      </Txt>

      <Gap size="lg" />

      <Txt variant="smallStrong" tone="muted">Vad?</Txt>
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
        label="Eller skriv något eget"
        value={title}
        onChangeText={setTitle}
        placeholder="Vad är du sugen på?"
        maxLength={80}
      />

      <Gap size="lg" />
      <Divider />

      <Txt variant="smallStrong" tone="muted">När?</Txt>
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
      <Txt variant="smallStrong" tone="muted">Hur länge?</Txt>
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
        label="Var?"
        value={locationName}
        onChangeText={setLocationName}
        placeholder="Letar upp var du är …"
        maxLength={80}
      />

      <Gap size="md" />
      <Txt variant="smallStrong" tone="muted">Hur många?</Txt>
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
          label="Spelar ingen roll"
          selected={capacity === null}
          onPress={() => setCapacity(null)}
        />
      </Row>

      <Gap size="md" />
      <PriceField value={priceSek} onChange={setPriceSek} />

      <Gap size="md" />
      <Txt variant="smallStrong" tone="muted">Vem får se?</Txt>
      <Gap size="sm" />
      <Row gap="sm" wrap>
        <Chip
          label="Alla i närheten"
          selected={visibility === "public"}
          onPress={() => setVisibility("public")}
        />
        <Chip
          label="Bara kompisar"
          selected={visibility === "friends"}
          onPress={() => setVisibility("friends")}
        />
      </Row>

    </Screen>
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Något gick fel.";
}
