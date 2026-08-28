/**
 * Kostar det något på plats?
 *
 * Avstängt från början och osynligt tills någon slår på det. Det är
 * skillnaden mot en rad prisförslag: en sådan rad säger att prissättning är
 * ett normalt steg när man ordnar något, och då börjar det kännas som ett
 * event. Här är det en avvikelse man får påpeka om den finns.
 *
 * Ordet är "kostar på plats" och inte "pris", eftersom värden inte tar
 * betalt. Bastun gör det. Var pengarna hamnar är hela skillnaden mellan en
 * hängning och ett arrangemang.
 */

import { useState } from "react";
import { Switch, View } from "react-native";

import { Field, Gap, Row, Txt } from "@/components/ui";
import { t } from "@/i18n";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  value: number | null;
  onChange(value: number | null): void;
}

export function PriceField({ value, onChange }: Props) {
  const theme = useTheme();
  const [on, setOn] = useState(value !== null);

  function toggle(next: boolean) {
    setOn(next);
    if (!next) onChange(null);
  }

  return (
    <>
      <Row justify="space-between" gap="md">
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt variant="smallStrong" tone="muted">{t.price.label}</Txt>
          <Txt variant="small" tone="faint">
            {t.price.help}
          </Txt>
        </View>
        <Switch
          value={on}
          onValueChange={toggle}
          trackColor={{ true: theme.color.primary, false: theme.color.surfaceAlt }}
          thumbColor={theme.color.surface}
        />
      </Row>

      {on && (
        <>
          <Gap size="sm" />
          <Field
            label={t.price.amount}
            value={value === null ? "" : String(value)}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, "").slice(0, 6);
              onChange(digits === "" ? null : Number(digits));
            }}
            keyboardType="number-pad"
            placeholder="120"
          />
        </>
      )}
    </>
  );
}
