/**
 * Inloggning med BankID.
 *
 * I mock-läge räcker vilket rimligt personnummer som helst — samma nummer ger
 * alltid samma person, så du kan hoppa mellan två testkonton genom att logga
 * ut och skriva ett annat nummer.
 */

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";

import { USING_MOCK } from "@/api";
import { useAuth, waitingMessage } from "@/auth/AuthContext";
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
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: radius.xl,
              backgroundColor: theme.color.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="people" size={42} color={theme.color.onPrimary} />
          </View>

          <Gap size="lg" />
          <Txt variant="display">FRIEND</Txt>
          <Gap size="xs" />
          <Txt variant="body" tone="muted" align="center" style={{ maxWidth: 300 }}>
            Hitta folk i närheten som vill göra samma sak som du.
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
              label="Personnummer"
              placeholder="ÅÅÅÅMMDD-XXXX"
              value={personalNumber}
              onChangeText={setPersonalNumber}
              keyboardType="number-pad"
              autoComplete="off"
              maxLength={13}
              returnKeyType="go"
              onSubmitEditing={() => valid && signIn(personalNumber)}
              error={signInState.phase === "failed" ? signInState.message : undefined}
              hint={USING_MOCK
                ? "Testläge: valfritt tolvsiffrigt nummer fungerar."
                : undefined}
            />

            <Gap size="lg" />

            <Button
              label="Logga in med BankID"
              icon="shield-checkmark"
              onPress={() => signIn(personalNumber)}
              disabled={!valid}
            />
          </>
        )}

        <Gap size="xl" />

        <Row gap="sm" justify="center">
          <Ionicons name="lock-closed" size={13} color={theme.color.textFaint} />
          <Txt variant="small" tone="faint" align="center" style={{ flexShrink: 1 }}>
            Alla på FRIEND är verifierade med BankID. Ditt personnummer lagras aldrig.
          </Txt>
        </Row>
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
        borderRadius: radius.lg,
        padding: space.xl,
        alignItems: "center",
        gap: space.md,
      }}
    >
      <Ionicons name="shield-checkmark" size={38} color={theme.color.primary} />
      <Txt variant="heading" align="center">{message}</Txt>
      <Txt variant="small" tone="muted" align="center">
        Håll appen öppen tills det är klart.
      </Txt>
      <Gap size="sm" />
      <Button label="Avbryt" kind="ghost" onPress={onCancel} />
    </View>
  );
}
