/**
 * Grundkomponenter.
 *
 * Allt som ritas i appen går genom de här, så att avstånd, radier och färger
 * kommer från temat i stället för att spridas ut som magiska tal i skärmarna.
 */

import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets, type Edge } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icons/Icon";
import { Tappable } from "@/components/Tappable";
import { t } from "@/i18n";
import { useTheme } from "@/hooks/useTheme";
import { font, fontFamily, radius, shadowFor, space } from "@/theme";

/* Text -------------------------------------------------------------------- */

type TextTone = "default" | "muted" | "faint" | "primary" | "danger" | "onPrimary";
type TextVariant = keyof typeof font;

interface TxtProps {
  children: ReactNode;
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextStyle["textAlign"];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

export function Txt({
  children,
  variant = "body",
  tone = "default",
  align,
  numberOfLines,
  style,
}: TxtProps) {
  const theme = useTheme();
  const colors: Record<TextTone, string> = {
    default: theme.color.text,
    muted: theme.color.textMuted,
    faint: theme.color.textFaint,
    primary: theme.color.primary,
    danger: theme.color.danger,
    onPrimary: theme.color.onPrimary,
  };

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[font[variant] as TextStyle, { color: colors[tone], textAlign: align }, style]}
    >
      {children}
    </Text>
  );
}

/* Layout ------------------------------------------------------------------ */

export function Screen({
  children,
  scroll = false,
  edges = ["top"],
  padded = true,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
  /**
   * Huvudhandlingen, fäst i underkant utanför scrollytan.
   *
   * En knapp som ligger sist i en lång scroll är svår att nå och hamnar
   * dessutom i iPhones gestzon längst ned, där systemet tar trycket före
   * appen. Den känns då död utan att vara det. Ligger den här är den
   * alltid synlig och alltid tryckbar.
   */
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padding = padded ? { paddingHorizontal: space.lg } : undefined;

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: theme.color.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, { paddingBottom: space.xxxl }]}
          /*
            "always" och inte "handled".

            Med "handled" avgör React Native själv om ett tryck ska stänga
            tangentbordet eller nå knappen under, och med en animerad
            Pressable inuti en ScrollView blir svaret ofta fel: trycket
            stänger tangentbordet och knappen känner aldrig av det. För
            användaren ser det ut som att knappen är död.

            "always" släpper alltid igenom trycket till det som ligger under.
          */
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding]}>{children}</View>
      )}

      {footer && (
        <View
          style={[
            padding,
            {
              paddingTop: space.md,
              // Gestzonen längst ned är systemets. Lägger vi knappen där tar
              // iOS trycket och appen ser trasig ut.
              paddingBottom: Math.max(insets.bottom, space.md),
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.color.border,
              backgroundColor: theme.color.bg,
            },
          ]}
        >
          {footer}
        </View>
      )}
    </SafeAreaView>
  );
}

export function Card({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.color.surface,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.color.border,
    overflow: "hidden",
  };

  if (!onPress) return <View style={[base, shadowFor(theme), style]}>{children}</View>;

  // Stora ytor sjunker in mindre, en full kortbredd som krymper 3 % ser ut
  // att studsa, medan samma rörelse på en knapp känns precis.
  return (
    <Tappable onPress={onPress} scale={0.985} style={[base, shadowFor(theme), style]}>
      {children}
    </Tappable>
  );
}

/** Lodrätt mellanrum. */
export function Gap({ size = "md" }: { size?: keyof typeof space }) {
  return <View style={{ height: space[size] }} />;
}

export function Row({
  children,
  gap = "sm",
  align = "center",
  justify = "flex-start",
  wrap = false,
  style,
}: {
  children: ReactNode;
  gap?: keyof typeof space;
  align?: ViewStyle["alignItems"];
  justify?: ViewStyle["justifyContent"];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: align,
          justifyContent: justify,
          gap: space[gap],
          flexWrap: wrap ? "wrap" : "nowrap",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.color.border,
        marginVertical: space.md,
      }}
    />
  );
}

/* Knappar ----------------------------------------------------------------- */

type ButtonKind = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  kind = "primary",
  icon,
  disabled = false,
  loading = false,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  const theme = useTheme();
  const inactive = disabled || loading;

  const styles: Record<ButtonKind, { bg: string; fg: string; border: string }> = {
    primary: {
      bg: theme.color.primary,
      fg: theme.color.onPrimary,
      border: "transparent",
    },
    secondary: {
      bg: theme.color.surface,
      fg: theme.color.text,
      border: theme.color.border,
    },
    ghost: { bg: "transparent", fg: theme.color.primary, border: "transparent" },
    danger: { bg: theme.color.dangerSoft, fg: theme.color.danger, border: "transparent" },
  };
  const palette = styles[kind];

  return (
    <Tappable
      onPress={onPress}
      disabled={inactive}
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive }}
      style={{
        backgroundColor: palette.bg,
        borderColor: palette.border,
        borderWidth: kind === "secondary" ? StyleSheet.hairlineWidth : 0,
        borderRadius: radius.pill,
        paddingVertical: 15,
        paddingHorizontal: space.xl,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: space.sm,
        alignSelf: fullWidth ? "stretch" : "flex-start",
        opacity: inactive ? 0.45 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={palette.fg} />}
          <Text style={[font.bodyStrong as TextStyle, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Tappable>
  );
}

/** Rund ikonknapp, t.ex. tillbaka eller bifoga. */
export function IconButton({
  icon,
  onPress,
  label,
  tone = "default",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  tone?: "default" | "primary" | "danger";
}) {
  const theme = useTheme();
  const color = tone === "primary"
    ? theme.color.primary
    : tone === "danger"
      ? theme.color.danger
      : theme.color.text;

  return (
    <Tappable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={10}
      scale={0.9}
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={22} color={color} />
    </Tappable>
  );
}

/* Bilder ------------------------------------------------------------------ */

/**
 * Profilbild med initialer som reserv.
 *
 * Bildkravet betyder att alla ska HA en bild, men nätet kan vara borta och
 * en URL kan ha ruttnat, då ska det ändå se helt ut.
 */
export function Avatar({
  uri,
  name,
  size = 44,
}: {
  uri: string | null;
  name: string;
  size?: number;
}) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const usable = uri && uri !== "pending" && !failed;

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  if (usable) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        contentFit="cover"
        transition={150}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.color.surfaceAlt,
        }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.color.primarySoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: size * 0.38,
          fontFamily: fontFamily.bodyBold,
          color: theme.color.primary,
        }}
      >
        {initials || "?"}
      </Text>
    </View>
  );
}

/* Meriter ----------------------------------------------------------------- */

/**
 * Det som visas i stället för ett betyg.
 *
 * Haka på hade stjärnbetyg en gång och de togs bort med flit: ett betyg mäter
 * hur väl två personer passade ihop men läses som en egenskap hos den ena, och
 * siffran följer med personen överallt. Det som står här är i stället fakta:
 * identiteten är styrkt, och så här mycket har personen faktiskt gjort.
 */
export function Credentials({
  verified,
  activityCount,
  memberSince,
  size = "small",
}: {
  verified?: boolean;
  activityCount?: number;
  memberSince?: string;
  size?: "micro" | "small";
}) {
  const theme = useTheme();
  const variant = size === "micro" ? "micro" : "small";
  const iconSize = size === "micro" ? 11 : 13;

  const parts: ReactNode[] = [];

  if (verified) {
    parts.push(
      <Row key="v" gap="xs">
        <Ionicons name="shield-checkmark" size={iconSize} color={theme.color.accent} />
        <Txt variant={variant} tone="muted">BankID</Txt>
      </Row>,
    );
  }

  if (activityCount !== undefined) {
    parts.push(
      <Txt key="a" variant={variant} tone="muted">
        {activityCount === 0
          ? t.credentials.noActivities
          : t.credentials.activities(activityCount)}
      </Txt>,
    );
  }

  if (memberSince) {
    parts.push(
      <Txt key="m" variant={variant} tone="faint">
        {t.credentials.memberSince(formatMonthYear(memberSince))}
      </Txt>,
    );
  }

  return (
    <Row gap="sm" wrap>
      {parts.map((part, i) => (
        <Row key={i} gap="sm">
          {i > 0 && <Txt variant={variant} tone="faint">·</Txt>}
          {part}
        </Row>
      ))}
    </Row>
  );
}

const MONTHS = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

/** "mars" om det är i år, annars "mars 2025". */
function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const month = MONTHS[d.getMonth()] ?? "";
  return d.getFullYear() === now.getFullYear() ? month : `${month} ${d.getFullYear()}`;
}

/* Chips ------------------------------------------------------------------- */

export function Chip({
  label,
  icon,
  selected = false,
  onPress,
  tone = "neutral",
}: {
  label: string;
  /** Namn i appens eget ikonset, inte i något bibliotek. */
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  tone?: "neutral" | "primary" | "accent" | "highlight";
}) {
  const theme = useTheme();

  const tones = {
    neutral: { bg: theme.color.surfaceAlt, fg: theme.color.textMuted },
    primary: { bg: theme.color.primarySoft, fg: theme.color.primary },
    accent: { bg: theme.color.primarySoft, fg: theme.color.accent },
    highlight: { bg: theme.color.surfaceAlt, fg: theme.color.text },
  };
  const palette = selected
    ? { bg: theme.color.primary, fg: theme.color.onPrimary }
    : tones[tone];

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: palette.bg,
        borderRadius: radius.pill,
        paddingVertical: 7,
        paddingLeft: icon ? space.sm + 2 : space.md,
        paddingRight: space.md,
      }}
    >
      {icon && <Icon name={icon} size={15} color={palette.fg} />}
      <Text style={[font.smallStrong as TextStyle, { color: palette.fg }]}>{label}</Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Tappable
      onPress={onPress}
      feedback="select"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      scale={0.94}
    >
      {content}
    </Tappable>
  );
}

/* Formulär ---------------------------------------------------------------- */

export function Field({
  label,
  hint,
  error,
  ...inputProps
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Txt variant="smallStrong" tone="muted">{label}</Txt>
      <Gap size="xs" />
      <TextInput
        placeholderTextColor={theme.color.textFaint}
        {...inputProps}
        onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
        style={[
          font.body as TextStyle,
          {
            color: theme.color.text,
            backgroundColor: theme.color.surface,
            borderWidth: 1,
            borderColor: error
              ? theme.color.danger
              : focused
                ? theme.color.primary
                : theme.color.border,
            borderRadius: radius.field,
            paddingHorizontal: space.md,
            paddingVertical: space.md,
            minHeight: inputProps.multiline ? 96 : undefined,
            textAlignVertical: inputProps.multiline ? "top" : "center",
          },
        ]}
      />
      {(error || hint) && (
        <>
          <Gap size="xs" />
          <Txt variant="small" tone={error ? "danger" : "faint"}>{error ?? hint}</Txt>
        </>
      )}
    </View>
  );
}

/* Tillstånd --------------------------------------------------------------- */

export function Loading({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
      <ActivityIndicator color={theme.color.primary} size="large" />
      {label && <Txt variant="small" tone="muted">{label}</Txt>}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: "center", paddingVertical: space.xxxl, gap: space.sm }}>
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: radius.pill,
          backgroundColor: theme.color.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: space.sm,
        }}
      >
        <Ionicons name={icon} size={30} color={theme.color.primary} />
      </View>
      <Txt variant="heading" align="center">{title}</Txt>
      <Txt variant="small" tone="muted" align="center" style={{ maxWidth: 300 }}>
        {body}
      </Txt>
      {action && (
        <>
          <Gap size="md" />
          <Button label={action.label} onPress={action.onPress} fullWidth={false} />
        </>
      )}
    </View>
  );
}

/** Liten etikett ovanpå bilder, t.ex. "3 platser kvar" eller "Bara kompisar". */
export function Badge({
  label,
  icon,
  tone = "dark",
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: "dark" | "primary" | "accent";
}) {
  const theme = useTheme();
  const palette = {
    dark: { bg: "rgba(12,14,18,0.72)", fg: "#FFFFFF" },
    primary: { bg: theme.color.primary, fg: theme.color.onPrimary },
    accent: { bg: theme.color.accent, fg: "#FFFFFF" },
  }[tone];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: palette.bg,
        borderRadius: radius.pill,
        paddingVertical: 5,
        paddingHorizontal: space.sm + 2,
      }}
    >
      {icon && <Ionicons name={icon} size={12} color={palette.fg} />}
      <Text style={[font.micro as TextStyle, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}
