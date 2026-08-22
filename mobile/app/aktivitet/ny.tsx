/**
 * Skapa aktivitet.
 *
 * Formuläret är byggt kring att det ska gå snabbt att lägga upp "Fiska i
 * Drevviken 13–15". Bild, titel, plats och tid, resten är frivilligt.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { getBackend } from "@/api";
import { INTERESTS, type IconName } from "@/api/interests";
import type { ActivityVisibility } from "@/api/types";
import {
  Button, Chip, Divider, Field, Gap, Row, Screen, Txt,
} from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { pickImage } from "@/lib/image";
import { describePlace, getCurrentPlace } from "@/lib/location";
import { addHours, formatActivityWhen } from "@/lib/time";
import { radius, space } from "@/theme";

const CAPACITIES = [
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "6", value: 6 },
  { label: "10", value: 10 },
  { label: "Ingen gräns", value: null },
];

export default function NewActivityScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Startar man från "Gör om" på en tidigare aktivitet kommer titeln med.
  const params = useLocalSearchParams<{ title?: string; category?: string }>();

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [title, setTitle] = useState(params.title ?? "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [locationName, setLocationName] = useState("");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [visibility, setVisibility] = useState<ActivityVisibility>("public");
  const [capacity, setCapacity] = useState<number | null>(4);
  const [saving, setSaving] = useState(false);

  // Förvalt: nästa hela timme imorgon, två timmar lång.
  const [startsAt, setStartsAt] = useState(() => {
    const d = addHours(new Date(), 24);
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [durationHours, setDurationHours] = useState(2);
  const [picker, setPicker] = useState<"date" | "time" | null>(null);

  const endsAt = useMemo(
    () => addHours(startsAt, durationHours),
    [startsAt, durationHours],
  );

  useEffect(() => {
    (async () => {
      try {
        const place = await getCurrentPlace();
        setPoint({ lat: place.lat, lng: place.lng });
        setLocationName((current) => current || place.label);
      } catch {
        // Utan position får värden skriva platsen själv.
      }
    })();
  }, []);

  /** Vad som fattas, eller null när allt är klart. */
  const missing =
    coverUri === null
      ? "En bild krävs."
      : title.trim().length < 3
        ? "Ge aktiviteten en titel."
        : !locationName.trim() || !point
          ? "Fyll i var ni ska vara."
          : startsAt.getTime() <= Date.now()
            ? "Välj en tid som ligger framåt."
            : null;

  const ready = missing === null;

  async function chooseCover() {
    try {
      const uri = await pickImage("activity-covers");
      if (uri) setCoverUri(uri);
    } catch (error) {
      Alert.alert("Kunde inte välja bild", describe(error));
    }
  }

  async function useCurrentLocation() {
    try {
      const place = await getCurrentPlace();
      setPoint({ lat: place.lat, lng: place.lng });
      setLocationName(await describePlace(place));
    } catch (error) {
      Alert.alert("Kunde inte hämta platsen", describe(error));
    }
  }

  async function create() {
    if (!ready || !coverUri || !point) {
      // Knappen är tryckbar även när något fattas, för en avstängd knapp
      // säger ingenting. Då måste det här säga det i stället.
      Alert.alert("Något fattas", missing ?? "Fyll i allt först.");
      return;
    }
    setSaving(true);
    try {
      const coverUrl = await getBackend().uploadImage("activity-covers", coverUri);
      const activity = await getBackend().createActivity({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category ?? undefined,
        coverUrl,
        locationName: locationName.trim(),
        lat: point.lat,
        lng: point.lng,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        visibility,
        capacity,
      });
      router.replace(`/aktivitet/${activity.id}`);
    } catch (error) {
      Alert.alert("Kunde inte skapa aktiviteten", describe(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      scroll
      edges={[]}
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

      {/* Bilden först, det är den folk ser i flödet. */}
      <Pressable onPress={chooseCover} accessibilityLabel="Välj omslagsbild">
        {coverUri ? (
          <View>
            <Image
              source={{ uri: coverUri }}
              style={{ width: "100%", height: 190, borderRadius: radius.card }}
              contentFit="cover"
            />
            <View
              style={{
                position: "absolute",
                bottom: space.md,
                right: space.md,
                backgroundColor: "rgba(12,14,18,0.72)",
                borderRadius: radius.pill,
                paddingVertical: 7,
                paddingHorizontal: space.md,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Ionicons name="camera" size={14} color="#FFFFFF" />
              <Txt variant="micro" style={{ color: "#FFFFFF" }}>BYT BILD</Txt>
            </View>
          </View>
        ) : (
          <View
            style={{
              height: 190,
              borderRadius: radius.card,
              backgroundColor: theme.color.primarySoft,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: theme.color.primary,
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Ionicons name="image" size={30} color={theme.color.primary} />
            <Txt variant="smallStrong" tone="primary">Välj en bild</Txt>
            <Txt variant="small" tone="muted">Krav, det är den som får folk att haka på</Txt>
          </View>
        )}
      </Pressable>

      <Gap size="xl" />

      <Field
        label="Vad ska ni göra?"
        value={title}
        onChangeText={setTitle}
        placeholder="Fiska i Drevviken"
        maxLength={80}
      />

      <Gap size="md" />

      <Field
        label="Berätta lite mer"
        value={description}
        onChangeText={setDescription}
        placeholder="Vad ska man ta med? Behöver man kunna något?"
        multiline
        maxLength={2000}
      />

      <Gap size="lg" />

      <Txt variant="smallStrong" tone="muted">Kategori</Txt>
      <Gap size="sm" />
      <Row gap="sm" wrap>
        {INTERESTS.map((interest) => (
          <Chip
            key={interest.slug}
            label={interest.label}
            icon={interest.icon as IconName}
            selected={category === interest.slug}
            onPress={() => setCategory(category === interest.slug ? null : interest.slug)}
          />
        ))}
      </Row>

      <Gap size="lg" />
      <Divider />

      <Field
        label="Var?"
        value={locationName}
        onChangeText={setLocationName}
        placeholder="Drevviken, Skarpnäck"
      />
      <Gap size="sm" />
      <Button
        label={point ? "Använd min position igen" : "Använd min position"}
        icon="location"
        kind="ghost"
        onPress={useCurrentLocation}
        fullWidth={false}
      />

      <Gap size="lg" />
      <Divider />

      <Txt variant="smallStrong" tone="muted">När?</Txt>
      <Gap size="sm" />

      <View
        style={{
          backgroundColor: theme.color.surface,
          borderRadius: radius.field,
          borderWidth: 1,
          borderColor: theme.color.border,
          padding: space.md,
        }}
      >
        <Txt variant="bodyStrong">
          {formatActivityWhen(startsAt.toISOString(), endsAt.toISOString())}
        </Txt>
        <Gap size="sm" />
        <Row gap="sm">
          <Button
            label="Ändra dag"
            kind="secondary"
            icon="calendar"
            onPress={() => setPicker("date")}
            fullWidth={false}
          />
          <Button
            label="Ändra tid"
            kind="secondary"
            icon="time"
            onPress={() => setPicker("time")}
            fullWidth={false}
          />
        </Row>
      </View>

      {picker && (
        <DateTimePicker
          value={startsAt}
          mode={picker}
          minimumDate={picker === "date" ? new Date() : undefined}
          onChange={(event, selected) => {
            // Android stänger väljaren själv; iOS visar den inline.
            if (Platform.OS === "android") setPicker(null);
            if (event.type === "dismissed" || !selected) return;
            setStartsAt(selected);
          }}
        />
      )}

      <Gap size="md" />
      <Txt variant="smallStrong" tone="muted">Hur länge?</Txt>
      <Gap size="sm" />
      <Row gap="sm" wrap>
        {[1, 2, 3, 4, 6, 8].map((hours) => (
          <Chip
            key={hours}
            label={`${hours} tim`}
            selected={durationHours === hours}
            onPress={() => setDurationHours(hours)}
          />
        ))}
      </Row>

      <Gap size="lg" />
      <Divider />

      <Txt variant="smallStrong" tone="muted">Vem får se den?</Txt>
      <Gap size="sm" />
      <VisibilityChoice value={visibility} onChange={setVisibility} />

      <Gap size="lg" />

      <Txt variant="smallStrong" tone="muted">Hur många kan haka på?</Txt>
      <Gap size="sm" />
      <Row gap="sm" wrap>
        {CAPACITIES.map((option) => (
          <Chip
            key={option.label}
            label={option.label}
            selected={capacity === option.value}
            onPress={() => setCapacity(option.value)}
          />
        ))}
      </Row>


    </Screen>
  );
}

function VisibilityChoice({
  value,
  onChange,
}: {
  value: ActivityVisibility;
  onChange: (value: ActivityVisibility) => void;
}) {
  const theme = useTheme();

  const options: {
    key: ActivityVisibility;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    body: string;
  }[] = [
    {
      key: "public",
      icon: "globe",
      title: "Alla i närheten",
      body: "Syns i flödet för alla som är i området.",
    },
    {
      key: "friends",
      icon: "heart",
      title: "Bara mina kompisar",
      body: "Ingen annan ser den. Bra för sånt du bara delar med folk du känner.",
    },
  ];

  return (
    <View style={{ gap: space.sm }}>
      {options.map((option) => {
        const selected = value === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              padding: space.md,
              borderRadius: radius.field,
              borderWidth: 1.5,
              borderColor: selected ? theme.color.primary : theme.color.border,
              backgroundColor: selected ? theme.color.primarySoft : theme.color.surface,
            }}
          >
            <Ionicons
              name={option.icon}
              size={21}
              color={selected ? theme.color.primary : theme.color.textFaint}
            />
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">{option.title}</Txt>
              <Txt variant="small" tone="muted">{option.body}</Txt>
            </View>
            {selected && (
              <Ionicons name="checkmark-circle" size={21} color={theme.color.primary} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Något gick fel.";
}
