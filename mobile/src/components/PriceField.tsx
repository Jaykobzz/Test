/**
 * Kostnad per person.
 *
 * Snabbvalen finns för att de flesta priser i det här sammanhanget är runda
 * hundralappar, och för att ett tryck slår att skriva. "Annat" finns för att
 * bastun kostar 120 och inte 100.
 *
 * Gratis är ett eget val och inte ett tomt fält. Skillnaden spelar roll:
 * väljer man gratis kan appen skriva ut "Gratis" med säkerhet, och då slipper
 * någon dyka upp och bli överraskad vid grinden.
 */

import { useState } from "react";

import { Chip, Field, Gap, Row, Txt } from "@/components/ui";

const QUICK = [50, 100, 150, 200] as const;

interface Props {
  value: number | null;
  onChange(value: number | null): void;
}

export function PriceField({ value, onChange }: Props) {
  const quick = value !== null && (QUICK as readonly number[]).includes(value);
  const [custom, setCustom] = useState(!quick && value !== null);

  function pick(amount: number | null) {
    setCustom(false);
    onChange(amount);
  }

  return (
    <>
      <Txt variant="smallStrong" tone="muted">Kostar det något?</Txt>
      <Gap size="xs" />
      <Txt variant="small" tone="faint">
        Per person. Ta med bastu, bana eller biljett här så slipper folk bli
        överraskade på plats.
      </Txt>
      <Gap size="sm" />

      <Row gap="sm" wrap>
        <Chip
          label="Gratis"
          selected={value === null && !custom}
          onPress={() => pick(null)}
        />
        {QUICK.map((amount) => (
          <Chip
            key={amount}
            label={`${amount} kr`}
            selected={!custom && value === amount}
            onPress={() => pick(amount)}
          />
        ))}
        <Chip
          label="Annat"
          selected={custom}
          onPress={() => { setCustom(true); onChange(null); }}
        />
      </Row>

      {custom && (
        <>
          <Gap size="sm" />
          <Field
            label="Belopp i kronor"
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
