/**
 * "Skulle du göra om det?"
 *
 * En person i taget, två knappar. Svaret är privat och den andra får aldrig
 * veta vad du valde, vilket är hela anledningen till att det går att svara
 * ärligt. Ett nej gör ingenting alls: ingen siffra, ingen markering, ingen
 * påverkan på personens flöde eller möjlighet att ansöka någonstans.
 *
 * Skärmen visar aldrig utfallet av ett svar. Om den sa "ingen matchning"
 * skulle ett uteblivet ja gå att räkna ut, och då vore hela tystnaden värdelös.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, View } from "react-native";

import { getBackend } from "@/api";
import type { RematchPrompt } from "@/api/types";
import { Avatar, Button, Card, Gap, Loading, Row, Screen, Txt } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { radius, space } from "@/theme";

export default function RematchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();

  const [queue, setQueue] = useState<RematchPrompt[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await getBackend().rematchPrompts();
        setQueue(all.filter((p) => p.activityId === activityId));
      } finally {
        setLoading(false);
      }
    })();
  }, [activityId]);

  if (loading) return <Screen><Loading /></Screen>;

  const person = queue[index];

  if (!person) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: space.md }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.pill,
              backgroundColor: theme.color.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="checkmark" size={30} color={theme.color.accent} />
          </View>
          <Txt variant="heading" align="center">Tack!</Txt>
          <Txt variant="body" tone="muted" align="center" style={{ maxWidth: 280 }}>
            Om någon vill göra om det med dig hör vi av oss.
          </Txt>
          <Gap size="md" />
          <Button label="Klart" onPress={() => router.back()} fullWidth={false} />
        </View>
      </Screen>
    );
  }

  async function answer(wantsAgain: boolean) {
    if (!person) return;
    setSaving(true);
    try {
      await getBackend().submitRematch(person.activityId, person.userId, wantsAgain);
      setIndex((i) => i + 1);
    } catch (error) {
      Alert.alert("Kunde inte spara svaret", describe(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Gap size="xl" />

      {queue.length > 1 && (
        <>
          <Txt variant="micro" tone="faint" align="center">
            {index + 1} AV {queue.length}
          </Txt>
          <Gap size="lg" />
        </>
      )}

      <View style={{ alignItems: "center" }}>
        <Avatar uri={person.avatarUrl} name={person.displayName} size={112} />
        <Gap size="lg" />
        <Txt variant="title" align="center">
          Skulle du göra om det med {person.displayName}?
        </Txt>
        <Gap size="sm" />
        <Txt variant="body" tone="muted" align="center">
          {person.activityTitle}
        </Txt>
      </View>

      <Gap size="xxl" />

      <Row gap="md">
        <View style={{ flex: 1 }}>
          <Button
            label="Nej tack"
            kind="secondary"
            onPress={() => answer(false)}
            disabled={saving}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Ja gärna"
            icon="repeat"
            onPress={() => answer(true)}
            disabled={saving}
          />
        </View>
      </Row>

      <Gap size="xl" />

      <Card>
        <View style={{ padding: space.lg }}>
          <Row gap="sm" align="flex-start">
            <Ionicons name="lock-closed" size={16} color={theme.color.textFaint} />
            <View style={{ flex: 1 }}>
              <Txt variant="small" tone="muted">
                {person.displayName} får aldrig veta vad du svarar. Ni hör bara av
                varandra om ni båda svarar ja.
              </Txt>
            </View>
          </Row>
        </View>
      </Card>
    </Screen>
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Något gick fel.";
}
