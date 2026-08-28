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
import { t } from "@/i18n";
import { PriceField } from "@/components/PriceField";
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
  { label: t.plan.noLimit, value: null },
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
  const [priceSek, setPriceSek] = useState<number | null>(null);
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
      ? t.plan.needCover
      : title.trim().length < 3
        ? t.plan.needTitle
        : !locationName.trim() || !point
          ? t.plan.needPlace
          : startsAt.getTime() <= Date.now()
            ? t.plan.needFutureTime
            : null;

  const ready = missing === null;

  async function chooseCover() {
    try {
      const uri = await pickImage("activity-covers");
      if (uri) setCoverUri(uri);
    } catch (error) {
      Alert.alert(t.plan.coverFailed, describe(error));
    }
  }

  async function useCurrentLocation() {
    try {
      const place = await getCurrentPlace();
      setPoint({ lat: place.lat, lng: place.lng });
      setLocationName(await describePlace(place));
    } catch (error) {
      Alert.alert(t.plan.locationFailed, describe(error));
    }
  }

  async function create() {
    if (!ready || !coverUri || !point) {
      // Knappen är tryckbar även när något fattas, för en avstängd knapp
      // säger ingenting. Då måste det här säga det i stället.
      Alert.alert(t.common.missing, missing ?? t.plan.needAll);
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
        priceSek,
      });
      router.replace(`/aktivitet/${activity.id}`);
    } catch (error) {
      Alert.alert(t.plan.createFailed, describe(error));
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
            label={saving ? t.create.posting : t.create.post}
            onPress={create}
            loading={saving}
          />
        </>
      }
    >
      <Gap size="lg" />

      {/* Bilden först, det är den folk ser i flödet. */}
      <Pressable onPress={chooseCover} accessibilityLabel={t.plan.chooseCover}>
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
            <Txt variant="smallStrong" tone="primary">{t.plan.pickCover}</Txt>
            <Txt variant="small" tone="muted">{t.plan.coverRequired}</Txt>
          </View>
        )}
      </Pressable>

      <Gap size="xl" />

      <Field
        label={t.plan.titleLabel}
        value={title}
        onChangeText={setTitle}
        placeholder="Fiska i Drevviken"
        maxLength={80}
      />

      <Gap size="md" />

      <Field
        label={t.plan.descriptionLabel}
        value={description}
        onChangeText={setDescription}
        placeholder={t.plan.descriptionPlaceholder}
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
        label={t.create.where}
        value={locationName}
        onChangeText={setLocationName}
        placeholder={t.plan.placePlaceholder}
      />
      <Gap size="sm" />
      <Button
        label={point ? t.plan.useMyLocationAgain : t.plan.useMyLocation}
        icon="location"
        kind="ghost"
        onPress={useCurrentLocation}
        fullWidth={false}
      />

      <Gap size="lg" />
      <Divider />

      <Txt variant="smallStrong" tone="muted">{t.create.when}</Txt>
      <Gap size="sm" />

      {/*
        iOS och Android vill ha olika saker här.

        Tidigare fanns två knappar som fällde ut en väljare under rutan. På
        iOS ritas väljaren inline, så tiden hamnade löst under fältet i
        stället för i det. Med display "compact" blir varje väljare ett eget
        litet fält som öppnar sin egen popover, vilket är det iOS självt gör.

        Android har ingen compact-variant utan öppnar alltid en egen dialog,
        så där behövs knapparna.
      */}
      {Platform.OS === "ios" ? (
        <Row gap="sm">
          <DateTimePicker
            value={startsAt}
            mode="date"
            display="compact"
            minimumDate={new Date()}
            accentColor={theme.color.primary}
            themeVariant={theme.dark ? "dark" : "light"}
            onChange={(_, selected) => selected && setStartsAt(selected)}
          />
          <DateTimePicker
            value={startsAt}
            mode="time"
            display="compact"
            accentColor={theme.color.primary}
            themeVariant={theme.dark ? "dark" : "light"}
            onChange={(_, selected) => selected && setStartsAt(selected)}
          />
        </Row>
      ) : (
        <>
          <Row gap="sm">
            <Button
              label={t.plan.pickDay}
              kind="secondary"
              icon="calendar"
              onPress={() => setPicker("date")}
              fullWidth={false}
            />
            <Button
              label={t.plan.pickTime}
              kind="secondary"
              icon="time"
              onPress={() => setPicker("time")}
              fullWidth={false}
            />
          </Row>
          {picker && (
            <DateTimePicker
              value={startsAt}
              mode={picker}
              minimumDate={picker === "date" ? new Date() : undefined}
              onChange={(event, selected) => {
                setPicker(null);
                if (event.type === "dismissed" || !selected) return;
                setStartsAt(selected);
              }}
            />
          )}
        </>
      )}

      <Gap size="sm" />
      {/* Sammanfattningen i klartext, så man ser hela spannet på en gång. */}
      <Txt variant="small" tone="muted">
        {formatActivityWhen(startsAt.toISOString(), endsAt.toISOString())}
      </Txt>

      <Gap size="md" />
      <Txt variant="smallStrong" tone="muted">{t.create.howLong}</Txt>
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

      <Txt variant="smallStrong" tone="muted">{t.plan.whoSees}</Txt>
      <Gap size="sm" />
      <VisibilityChoice value={visibility} onChange={setVisibility} />

      <Gap size="lg" />

      <PriceField value={priceSek} onChange={setPriceSek} />

      <Gap size="lg" />

      <Txt variant="smallStrong" tone="muted">{t.create.howMany}</Txt>
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
      title: t.create.everyone,
      body: t.plan.publicHelp,
    },
    {
      key: "friends",
      icon: "heart",
      title: "Bara mina kompisar",
      body: t.plan.friendsHelp,
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
  return error instanceof Error ? error.message : t.common.somethingWrong;
}
