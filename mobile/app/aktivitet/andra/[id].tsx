/**
 * Ändra en aktivitet.
 *
 * Egen skärm och inte ett läge i skapaformuläret. Att ändra är en annan sak
 * än att skapa: bilden finns redan, kategorin är satt, och det man faktiskt
 * kommer hit för är nästan alltid tiden. Att låta ett formulär tjäna båda
 * syftena hade gjort skapaflödet krångligare för att lösa ett problem som
 * uppstår efteråt.
 *
 * Ändras tid eller plats skriver servern en hälsning i tråden. Det är hela
 * poängen: en ändring ingen får veta om är värre än ingen ändring alls.
 */

import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, View } from "react-native";

import { getBackend } from "@/api";
import type { ActivityDetail, ActivityVisibility } from "@/api/types";
import { PriceField } from "@/components/PriceField";
import {
  Button, Chip, Divider, Field, Gap, Loading, Row, Screen, Txt,
} from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { addHours, formatActivityWhen } from "@/lib/time";

const CAPACITIES = [1, 2, 3, 4, 6, 10] as const;

export default function EditActivityScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [original, setOriginal] = useState<ActivityDetail | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [startsAt, setStartsAt] = useState(new Date());
  const [hours, setHours] = useState(2);
  const [capacity, setCapacity] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<ActivityVisibility>("public");
  const [priceSek, setPriceSek] = useState<number | null>(null);
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const a = await getBackend().getActivity(id);
        setOriginal(a);
        setTitle(a.title);
        setDescription(a.description ?? "");
        setLocationName(a.locationName);
        setStartsAt(new Date(a.startsAt));
        setHours(Math.max(1, Math.round(
          (Date.parse(a.endsAt) - Date.parse(a.startsAt)) / 3_600_000)));
        setCapacity(a.capacity);
        setVisibility(a.visibility);
        setPriceSek(a.priceSek);
      } catch (error) {
        Alert.alert("Kunde inte hämta aktiviteten", describe(error));
        router.back();
      }
    })();
  }, [id, router]);

  const endsAt = useMemo(() => addHours(startsAt, hours), [startsAt, hours]);

  if (!original) return <Screen><Loading /></Screen>;

  const accepted = original.accepted.length;

  const missing =
    title.trim().length < 3
      ? "Titeln behöver minst tre tecken."
      : !locationName.trim()
        ? "Fyll i var ni ska vara."
        : startsAt.getTime() <= Date.now()
          ? "Välj en tid som ligger framåt."
          : capacity !== null && capacity < accepted
            ? `Redan ${accepted} med, går inte att sänka under det.`
            : null;

  async function save() {
    if (missing || !original) {
      Alert.alert("Går inte att spara", missing ?? "Något fattas.");
      return;
    }
    setSaving(true);
    try {
      await getBackend().updateActivity(original.id, {
        title: title.trim(),
        description: description.trim(),
        locationName: locationName.trim(),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        capacity,
        visibility,
        priceSek,
      });
      router.back();
    } catch (error) {
      Alert.alert("Kunde inte spara", describe(error));
    } finally {
      setSaving(false);
    }
  }

  const timeChanged = startsAt.toISOString() !== original.startsAt;
  const placeChanged = locationName.trim() !== original.locationName;

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
            label={saving ? "Sparar …" : "Spara ändringar"}
            onPress={save}
            loading={saving}
          />
        </>
      }
    >
      <Gap size="lg" />

      {/*
        Varning i förväg, inte ett besked i efterhand. Den som flyttar en tid
        ska veta att sex personer får en hälsning innan hen sparar.
      */}
      {(timeChanged || placeChanged) && accepted > 0 && (
        <>
          <View
            style={{
              backgroundColor: theme.color.primarySoft,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <Txt variant="smallStrong" tone="primary">
              {accepted === 1
                ? "Personen som är med får veta i chatten"
                : `De ${accepted} som är med får veta i chatten`}
            </Txt>
            <Txt variant="small" tone="muted">
              {timeChanged && placeChanged
                ? "Både tiden och platsen har ändrats."
                : timeChanged ? "Tiden har ändrats." : "Platsen har ändrats."}
            </Txt>
          </View>
          <Gap size="lg" />
        </>
      )}

      <Field label="Vad ska ni göra?" value={title} onChangeText={setTitle} maxLength={80} />

      <Gap size="md" />
      <Field
        label="Beskrivning"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={2000}
      />

      <Gap size="lg" />
      <Divider />

      <Txt variant="smallStrong" tone="muted">När?</Txt>
      <Gap size="sm" />
      {Platform.OS === "ios" ? (
        <Row gap="sm">
          <DateTimePicker
            value={startsAt}
            mode="date"
            display="compact"
            minimumDate={new Date()}
            accentColor={theme.color.primary}
            themeVariant={theme.dark ? "dark" : "light"}
            onChange={(_, d) => d && setStartsAt(d)}
          />
          <DateTimePicker
            value={startsAt}
            mode="time"
            display="compact"
            accentColor={theme.color.primary}
            themeVariant={theme.dark ? "dark" : "light"}
            onChange={(_, d) => d && setStartsAt(d)}
          />
        </Row>
      ) : (
        <>
          <Row gap="sm">
            <Button label="Välj dag" kind="secondary" icon="calendar"
              onPress={() => setPicker("date")} fullWidth={false} />
            <Button label="Välj tid" kind="secondary" icon="time"
              onPress={() => setPicker("time")} fullWidth={false} />
          </Row>
          {picker && (
            <DateTimePicker
              value={startsAt}
              mode={picker}
              minimumDate={picker === "date" ? new Date() : undefined}
              onChange={(event, d) => {
                setPicker(null);
                if (event.type === "dismissed" || !d) return;
                setStartsAt(d);
              }}
            />
          )}
        </>
      )}

      <Gap size="sm" />
      <Txt variant="small" tone="muted">
        {formatActivityWhen(startsAt.toISOString(), endsAt.toISOString())}
      </Txt>

      <Gap size="md" />
      <Txt variant="smallStrong" tone="muted">Hur länge?</Txt>
      <Gap size="sm" />
      <Row gap="sm" wrap>
        {[1, 2, 3, 4, 6, 8].map((h) => (
          <Chip key={h} label={`${h} tim`} selected={hours === h}
            onPress={() => setHours(h)} />
        ))}
      </Row>

      <Gap size="lg" />
      <Divider />

      <Field label="Var?" value={locationName} onChangeText={setLocationName} maxLength={80} />

      <Gap size="md" />
      <Txt variant="smallStrong" tone="muted">Hur många kan haka på?</Txt>
      {accepted > 0 && (
        <Txt variant="small" tone="faint">
          {accepted === 1 ? "1 person är redan med." : `${accepted} personer är redan med.`}
        </Txt>
      )}
      <Gap size="sm" />
      <Row gap="sm" wrap>
        {CAPACITIES.map((c) => (
          <Chip key={c} label={String(c)} selected={capacity === c}
            onPress={() => setCapacity(c)} />
        ))}
        <Chip label="Ingen gräns" selected={capacity === null}
          onPress={() => setCapacity(null)} />
      </Row>

      <Gap size="md" />
      <PriceField value={priceSek} onChange={setPriceSek} />

      <Gap size="md" />
      <Txt variant="smallStrong" tone="muted">Vem får se?</Txt>
      <Gap size="sm" />
      <Row gap="sm" wrap>
        <Chip label="Alla i närheten" selected={visibility === "public"}
          onPress={() => setVisibility("public")} />
        <Chip label="Bara kompisar" selected={visibility === "friends"}
          onPress={() => setVisibility("friends")} />
      </Row>

      <Gap size="xxl" />
    </Screen>
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Något gick fel.";
}
