/**
 * Inloggning med BankID.
 *
 * I mock-läge räcker vilket rimligt personnummer som helst, samma nummer ger
 * alltid samma person, så du kan hoppa mellan två testkonton genom att logga
 * ut och skriva ett annat nummer.
 */

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";

import { USING_MOCK } from "@/api";
import { t } from "@/i18n";
import { useAuth, waitingMessage } from "@/auth/AuthContext";
import { Logo } from "@/components/Logo";
import { Button, Field, Gap, Row, Screen, Txt } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { radius, space } from "@/theme";

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn, cancelSignIn, signInState } = useAuth();
  const [personalNumber, setPersonalNumber] = useState("");

  const digits = personalNumber.replace(/\D/g, "").length;
  const valid = digits === 10 || digits === 12;
  const busy = signInState.phase === "starting" || signInState.phase === "waiting";

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center" }}
      >
        <View style={{ alignItems: "center" }}>
          <Logo size={104} />

          <Gap size="lg" />
          <Txt variant="body" tone="muted" align="center" style={{ maxWidth: 300 }}>
            {t.login.tagline}
          </Txt>
        </View>

        <Gap size="xxxl" />

        {busy ? (
          <WaitingCard
            message={waitingMessage(
              signInState.phase === "waiting" ? signInState.hintCode : undefined,
            )}
            onCancel={cancelSignIn}
          />
        ) : (
          <>
            <Field
              label={t.login.personalNumber}
              placeholder={t.login.personalNumberHint}
              value={personalNumber}
              onChangeText={setPersonalNumber}
              keyboardType="number-pad"
              autoComplete="off"
              maxLength={13}
              returnKeyType="go"
              onSubmitEditing={() => valid && signIn(personalNumber)}
              error={signInState.phase === "failed" ? signInState.message : undefined}
              hint={USING_MOCK
                ? t.login.testMode
                : undefined}
            />

            <Gap size="lg" />

            <Button
              label={t.login.signIn}
              icon="shield-checkmark"
              onPress={() => signIn(personalNumber)}
              disabled={!valid}
            />
          </>
        )}

        <Gap size="xl" />

        {/*
          Hänglåset låg tidigare bredvid texten. Texten bryts på två rader,
          och en ikon som mittjusteras mot ett tvåradigt block hamnar mellan
          raderna och ser lös ut. Knappen ovanför bär redan en sköld, så en
          andra låsikon tillförde ingenting utom problemet.
        */}
        <Txt variant="small" tone="faint" align="center">
          {t.login.assurance}
        </Txt>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function WaitingCard({ message, onCancel }: { message: string; onCancel: () => void }) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.color.surface,
        borderRadius: radius.card,
        padding: space.xl,
        alignItems: "center",
        gap: space.md,
      }}
    >
      <Ionicons name="shield-checkmark" size={38} color={theme.color.primary} />
      <Txt variant="heading" align="center">{message}</Txt>
      <Txt variant="small" tone="muted" align="center">
        {t.login.keepOpen}
      </Txt>
      <Gap size="sm" />
      <Button label={t.common.cancel} kind="ghost" onPress={onCancel} />
    </View>
  );
}
