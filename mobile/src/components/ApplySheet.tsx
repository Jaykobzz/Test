/**
 * Rutan där man skriver sin rad och väljer nivå innan man hakar på.
 *
 * Poängen är värdens vy, inte den här. En värd med tjugo sökande såg tjugo
 * namn och tjugo bilder och hade ingenting att välja på. Intresse hjälper
 * inte där: alla som sökt till en fisketur gillar redan att fiska. Det som
 * skiljer sökande åt är vad de själva skriver.
 *
 * Därför är raden obligatorisk. Att den kostar något är inte en bieffekt
 * utan halva nyttan: den som skriver en mening dyker upp oftare än den som
 * tryckte en gång.
 */

import { useState } from "react";
import { Modal, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import type { ExperienceLevel } from "@/api/types";
import { t } from "@/i18n";
import { formatCost } from "@/lib/pris";
import { Button, Card, Chip, Field, Gap, Row, Txt } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { radius, space } from "@/theme";

/** Samma undre gräns som apply_to_activity(), så felet aldrig kommer först från servern. */
const MIN_LENGTH = 5;

const LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "first_time", label: t.apply.firstTime },
  { value: "some", label: t.apply.some },
  { value: "often", label: t.apply.often },
];

interface Props {
  visible: boolean;
  activityTitle: string;
  priceSek: number | null;
  working: boolean;
  onCancel(): void;
  onSubmit(message: string, experience: ExperienceLevel | undefined): void;
}

export function ApplySheet({
  visible,
  activityTitle,
  priceSek,
  working,
  onCancel,
  onSubmit,
}: Props) {
  const theme = useTheme();
  const [message, setMessage] = useState("");
  const [experience, setExperience] = useState<ExperienceLevel | undefined>();
  const [touched, setTouched] = useState(false);

  const tooShort = message.trim().length < MIN_LENGTH;
  // Felet visas först när någon försökt skicka, inte medan de skriver.
  const error = touched && tooShort ? t.apply.tooShort : undefined;

  function submit() {
    setTouched(true);
    if (tooShort) return;
    onSubmit(message.trim(), experience);
  }

  function close() {
    setMessage("");
    setExperience(undefined);
    setTouched(false);
    onCancel();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: theme.color.overlay }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View
            style={{
              backgroundColor: theme.color.bg,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              padding: space.xl,
              paddingBottom: space.xxl,
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              <Txt variant="title">{t.apply.title(activityTitle)}</Txt>
              <Gap size="xs" />
              <Txt variant="body" tone="muted">
                {t.apply.why}
              </Txt>

              {formatCost(priceSek) && (
                <>
                  <Gap size="md" />
                  {/* Sista gången kostnaden syns innan man tackar ja. */}
                  <Txt variant="small" tone="muted">
                    {formatCost(priceSek)}. {t.apply.payOnSite}
                  </Txt>
                </>
              )}

              <Gap size="lg" />

              <Field
                label={t.apply.yourLine}
                placeholder={t.apply.yourLinePlaceholder}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
                error={error}
              />

              <Gap size="lg" />

              <Txt variant="smallStrong" tone="muted">{t.apply.experience}</Txt>
              <Gap size="xs" />
              <Txt variant="small" tone="faint">
                {t.apply.experienceHelp}
              </Txt>
              <Gap size="sm" />
              <Row gap="sm" wrap>
                {LEVELS.map((level) => (
                  <Chip
                    key={level.value}
                    label={level.label}
                    selected={experience === level.value}
                    // Ett andra tryck ångrar valet, så det går att lämna tomt.
                    onPress={() =>
                      setExperience(experience === level.value ? undefined : level.value)
                    }
                  />
                ))}
              </Row>

              <Gap size="xl" />

              <Button
                label={t.apply.send}
                icon="paper-plane"
                onPress={submit}
                disabled={working}
              />
              <Gap size="sm" />
              <Button label={t.common.cancel} kind="ghost" onPress={close} disabled={working} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
