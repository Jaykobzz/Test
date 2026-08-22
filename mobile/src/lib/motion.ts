/**
 * Rörelsesystemet.
 *
 * Två regler bär allt här:
 *
 *   1. Fjädrar, inte kurvor. Ett gränssnitt som rör sig med `duration` känns
 *      som en webbsida. Ett som rör sig med massa och dämpning känns som ett
 *      föremål. Skillnaden är hela avståndet mellan "app" och "bra app".
 *
 *   2. Rörelse ska bära information, inte dekorera. Något som glider in
 *      underifrån kom nyss. Något som skalar ner blev tryckt på. Animation
 *      utan betydelse är brus, och brus är precis det som får ett gränssnitt
 *      att kännas billigt.
 *
 * Allt respekterar systemets "minska rörelse", se useMotion().
 */

import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useReducedMotion, type WithSpringConfig } from "react-native-reanimated";

/**
 * Fjäderkonfigurationer.
 *
 * Angivna i massa/styvhet/dämpning i stället för duration, eftersom en fjäder
 * som avbryts mitt i rörelsen fortsätter från sin nuvarande hastighet. Det är
 * det som gör att snabba upprepade tryck känns följsamma i stället för hackiga.
 */
export const spring = {
  /** Tryckrespons. Snärtig och nästan utan studs, som ett membran. */
  press: { mass: 0.35, stiffness: 620, damping: 32 } satisfies WithSpringConfig,

  /** Element som kommer in eller flyttar sig. Lite eftersläpning, ingen studs. */
  enter: { mass: 0.9, stiffness: 220, damping: 26 } satisfies WithSpringConfig,

  /** Layoutförändringar i listor när ett filter ändras. */
  layout: { mass: 0.8, stiffness: 260, damping: 30 } satisfies WithSpringConfig,

  /** Sådant som får studsa lite: en bekräftelse, en ny matchning. */
  bounce: { mass: 0.7, stiffness: 300, damping: 18 } satisfies WithSpringConfig,
} as const;

/** Hur mycket ett tryckbart element krymper. Mer än så ser leksaksaktigt ut. */
export const PRESS_SCALE = 0.972;

/**
 * Fördröjning mellan syskon i en lista som tonar in.
 *
 * 34 ms är avsiktligt kort. Det ska läsas som "listan landar" och inte som
 * att varje kort presenterar sig, den senare varianten är trevlig en gång
 * och outhärdlig den tionde.
 */
export const STAGGER_MS = 34;

/** Taket gör att en lång lista inte får element som dyker upp efter en sekund. */
export const STAGGER_MAX = 6;

export function staggerDelay(index: number): number {
  return Math.min(index, STAGGER_MAX) * STAGGER_MS;
}

/**
 * Haptik.
 *
 * Bara på iOS. Androids vibrationsmotor är i regel grövre, och en dov skakning
 * varje gång man rör en chip känns billigt i stället för exakt.
 */
export const haptic = {
  /** Val i en lista, chip, flik. Den lättaste som finns. */
  select() {
    if (Platform.OS === "ios") void Haptics.selectionAsync();
  },
  /** Något öppnades eller skickades. */
  tap() {
    if (Platform.OS === "ios") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },
  /** Något gick igenom: en ansökan accepterades, en matchning uppstod. */
  success() {
    if (Platform.OS === "ios") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },
  /** Något gick inte. */
  warn() {
    if (Platform.OS === "ios") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },
};

/**
 * Rörelseinställningar för den här enheten.
 *
 * Har användaren slagit på "minska rörelse" i systemet stängs förflyttning och
 * skalning av, men inte opacitet, som är den enda övergången som är trygg vid
 * rörelsekänslighet. Det är ett tillgänglighetskrav, inte en artighet.
 */
export function useMotion() {
  const reduced = useReducedMotion();

  return {
    reduced,
    /** Skalfaktor vid tryck. 1 = ingen skalning. */
    pressScale: reduced ? 1 : PRESS_SCALE,
    /** Hur långt något glider in underifrån. */
    enterOffset: reduced ? 0 : 14,
    stagger: (index: number) => (reduced ? 0 : staggerDelay(index)),
  };
}
