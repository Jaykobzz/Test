/**
 * Platshållare i innehållets form.
 *
 * En snurrande spinner säger "vänta" och ingenting mer. En platshållare som
 * har samma form som det som ska komma säger vad som är på väg och gör att
 * sidan inte hoppar när datan landar — det är skillnaden mellan att vänta och
 * att se något laddas.
 *
 * Pulsen är opacitet, inte en glidande glans. Glansen är ett webbmanér som
 * åldrats dåligt och som dessutom stannar synlig vid "minska rörelse".
 */

import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useMotion } from "@/lib/motion";
import { useTheme } from "@/hooks/useTheme";
import { radius, space } from "@/theme";

export function Skeleton({
  width,
  height = 14,
  rounded = radius.sm,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const motion = useMotion();
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    if (motion.reduced) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 760 }),
        withTiming(0.55, { duration: 760 }),
      ),
      -1,
      false,
    );
  }, [motion.reduced, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: width ?? "100%",
          height,
          borderRadius: rounded,
          backgroundColor: theme.color.surfaceAlt,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Ett aktivitetskort under laddning — samma mått som det riktiga kortet. */
export function ActivityCardSkeleton() {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.color.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.color.border,
        overflow: "hidden",
      }}
    >
      <Skeleton height={172} rounded={0} />
      <View style={{ padding: space.lg, gap: space.sm }}>
        <Skeleton width="72%" height={18} />
        <Skeleton width="45%" height={13} />
        <Skeleton width="55%" height={13} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            marginTop: space.sm,
          }}
        >
          <Skeleton width={30} height={30} rounded={15} />
          <Skeleton width={110} height={13} />
        </View>
      </View>
    </View>
  );
}
