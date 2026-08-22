/**
 * Tryckbart element med fysik.
 *
 * Ersätter Pressables opacitetsblink, som är den enskilt tydligaste
 * markören för ett gränssnitt som inte fått omsorg. iOS har aldrig använt
 * opacitet för tryck, allt som går att trycka på sjunker in något, med en
 * fjäder som fortsätter från sin nuvarande hastighet om man trycker igen
 * innan den hunnit tillbaka.
 *
 * Haptiken ligger på nedtryckningen, inte på släppet. Det är det som gör att
 * responsen känns som en konsekvens av fingret och inte som en fördröjd
 * kvittens.
 */

import { forwardRef, type ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { haptic, spring } from "@/lib/motion";
import { useMotion } from "@/lib/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type HapticKind = "select" | "tap" | "none";

export interface TappableProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Vilken sorts känsla trycket ger. "select" för chips och flikar. */
  feedback?: HapticKind;
  /** Hur mycket elementet sjunker in. Stora ytor tål mindre. */
  scale?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link" | "checkbox" | "radio";
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  hitSlop?: number;
}

export const Tappable = forwardRef<never, TappableProps>(function Tappable(
  {
    children,
    onPress,
    onLongPress,
    disabled = false,
    feedback = "tap",
    scale,
    style,
    accessibilityLabel,
    accessibilityRole = "button",
    accessibilityState,
    hitSlop,
  },
  _ref,
) {
  const motion = useMotion();
  const pressed = useSharedValue(0);

  const target = scale ?? motion.pressScale;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(1 - pressed.value * (1 - target), spring.press) },
    ],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        pressed.value = 1;
        if (disabled) return;
        if (feedback === "select") haptic.select();
        else if (feedback === "tap") haptic.tap();
      }}
      onPressOut={() => { pressed.value = 0; }}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled }}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
});
