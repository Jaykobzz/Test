/**
 * Betygsätt efter en aktivitet.
 *
 * Tre frågor per person: var det kul, var hen trevlig, kändes det tryggt.
 * De två första blir stjärnor. Den tredje blir aldrig en publik siffra — ett
 * nej går till moderation, inte till personens profil.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { getBackend } from "@/api";
import type { RateableActivity, RateablePerson } from "@/api/types";
import {
  Avatar, Button, Card, Field, Gap, Loading, Row, Screen, StarPicker, Txt,
} from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { radius, space } from "@/theme";

export default function RateScreen() {
  const router = useRouter();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();

  const [activity, setActivity] = useState<RateableActivity | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const all = await getBackend().activitiesAwaitingRating();
        setActivity(all.find((a) => a.activityId === activityId) ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [activityId]);

  if (loading) return <Screen><Loading /></Screen>;

  if (!activity || activity.people.length === 0) {
    return (
      <Screen>
        <Gap size="xxxl" />
        <Txt variant="heading" align="center">Allt betygsatt</Txt>
        <Gap size="sm" />
        <Txt variant="body" tone="muted" align="center">
          Tack. Det är sånt som gör att andra vågar tacka ja.
        </Txt>
        <Gap size="xl" />
        <Button label="Klart" onPress={() => router.back()} />
      </Screen>
    );
  }

  const person = activity.people[index];
  if (!person) {
    router.back();
    return <Screen><Loading /></Screen>;
  }

  function next() {
    if (!activity) return;
    if (index + 1 < activity.people.length) {
      setIndex(index + 1);
    } else {
      router.back();
    }
  }

  return (
    <RatingForm
      key={person.userId}
      activityId={activity.activityId}
      activityTitle={activity.title}
      person={person}
      position={index + 1}
      total={activity.people.length}
      onDone={next}
      onSkip={next}
    />
  );
}

function RatingForm({
  activityId,
  activityTitle,
  person,
  position,
  total,
  onDone,
  onSkip,
}: {
  activityId: string;
  activityTitle: string;
  person: RateablePerson;
  position: number;
  total: number;
  onDone: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();

  const [fun, setFun] = useState(0);
  const [friendliness, setFriendliness] = useState(0);
  const [feltSafe, setFeltSafe] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const ready = fun > 0 && friendliness > 0 && feltSafe !== null;

  async function submit() {
    if (!ready) return;
    setSaving(true);
    try {
      await getBackend().submitRating({
        activityId,
        rateeId: person.userId,
        fun,
        friendliness,
        feltSafe: feltSafe!,
        comment: comment.trim() || undefined,
      });
      onDone();
    } catch (error) {
      Alert.alert("Kunde inte spara betyget", describe(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll edges={[]}>
      <Gap size="lg" />

      {total > 1 && (
        <>
          <Txt variant="micro" tone="faint" align="center">
            {position} AV {total}
          </Txt>
          <Gap size="md" />
        </>
      )}

      <View style={{ alignItems: "center" }}>
        <Avatar uri={person.avatarUrl} name={person.displayName} size={82} />
        <Gap size="md" />
        <Txt variant="title">{person.displayName}</Txt>
        <Gap size="xs" />
        <Txt variant="small" tone="muted" align="center">
          {activityTitle}
        </Txt>
      </View>

      <Gap size="xl" />

      <Card>
        <View style={{ padding: space.lg, gap: space.xl }}>
          <StarPicker label="Hur kul var det?" value={fun} onChange={setFun} />
          <StarPicker
            label="Hur trevlig var hen?"
            value={friendliness}
            onChange={setFriendliness}
          />

          <View>
            <Txt variant="smallStrong" tone="muted">Kändes det tryggt?</Txt>
            <Gap size="sm" />
            <Row gap="sm">
              <SafetyChoice
                label="Ja, helt okej"
                icon="happy-outline"
                selected={feltSafe === true}
                onPress={() => setFeltSafe(true)}
              />
              <SafetyChoice
                label="Nej, inte riktigt"
                icon="alert-circle-outline"
                selected={feltSafe === false}
                danger
                onPress={() => setFeltSafe(false)}
              />
            </Row>

            {feltSafe === false && (
              <>
                <Gap size="sm" />
                <View
                  style={{
                    backgroundColor: theme.color.dangerSoft,
                    borderRadius: radius.md,
                    padding: space.md,
                  }}
                >
                  <Txt variant="small">
                    Tack för att du säger till. Det här går till oss som granskar —
                    det visas aldrig på personens profil och hen får inte veta vem
                    som skrivit det.
                  </Txt>
                </View>
              </>
            )}
          </View>

          <Field
            label={feltSafe === false ? "Vad hände?" : "Något du vill lägga till? (frivilligt)"}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            placeholder={feltSafe === false ? "Beskriv gärna vad som hände." : ""}
          />
        </View>
      </Card>

      <Gap size="lg" />

      <Button
        label={position === total ? "Spara och stäng" : "Spara och nästa"}
        onPress={submit}
        disabled={!ready}
        loading={saving}
      />
      <Gap size="sm" />
      <Button label="Hoppa över" kind="ghost" onPress={onSkip} />
      <Gap size="xl" />
    </Screen>
  );
}

function SafetyChoice({
  label,
  icon,
  selected,
  danger = false,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const active = danger ? theme.color.danger : theme.color.accent;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{
        flex: 1,
        alignItems: "center",
        gap: 6,
        paddingVertical: space.md,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: selected ? active : theme.color.border,
        backgroundColor: selected
          ? danger ? theme.color.dangerSoft : theme.color.accentSoft
          : theme.color.surface,
      }}
    >
      <Ionicons name={icon} size={24} color={selected ? active : theme.color.textFaint} />
      <Txt variant="smallStrong" align="center">{label}</Txt>
    </Pressable>
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Något gick fel.";
}
