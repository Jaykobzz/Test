/**
 * Designsystemet, riktning "Bryggan".
 *
 * Tokens kommer från Claude Designs handoff (design_handoff_bryggan). Djup
 * gran mot krämvitt, med bränd orange som accent. Accenten är avsiktligt
 * sparsam: **högst en förekomst per skärm**. Får den sitta på flera ställen
 * slutar den betyda något.
 *
 * Alla värden här är rolltokens. Ingen skärm får skriva en hexkod själv:
 * står färgen inte här hör den inte hemma i appen.
 */

import { Platform } from "react-native";
import type { TextStyle } from "react-native";

/* Typsnitt ---------------------------------------------------------------- */

/**
 * I React Native gör `fontWeight` ingenting för ett laddat typsnitt, varje
 * vikt är en egen fil med eget namn. Därför refereras vikterna vid namn i
 * stället för som siffror, och därför laddas exakt de fem som används.
 */
export const fontFamily = {
  displaySemi: "Unbounded_600SemiBold",
  displayBold: "Unbounded_700Bold",
  bodyRegular: "HankenGrotesk_400Regular",
  bodySemi: "HankenGrotesk_600SemiBold",
  bodyBold: "HankenGrotesk_700Bold",
} as const;

/* Färger ------------------------------------------------------------------ */

export interface Theme {
  dark: boolean;
  color: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    textFaint: string;
    primary: string;
    primarySoft: string;
    onPrimarySoft: string;
    onPrimary: string;
    accent: string;
    danger: string;
    dangerSoft: string;
    /** Halvgenomskinlig platta över foto. Samma i båda lägena. */
    overlay: string;
    onOverlay: string;
  };
}

export const lightTheme: Theme = {
  dark: false,
  color: {
    bg: "#F7F5EF",
    surface: "#FFFFFF",
    surfaceAlt: "#EEEAE0",
    border: "#DFD9CB",
    text: "#14201B",
    textMuted: "#56635C",
    textFaint: "#83908A",
    primary: "#15604B",
    primarySoft: "#D9EBE2",
    onPrimarySoft: "#0D4A39",
    onPrimary: "#FFFFFF",
    accent: "#B3541E",
    danger: "#B3261E",
    dangerSoft: "#F7E0DA",
    overlay: "rgba(12,14,18,0.72)",
    onOverlay: "#FFFFFF",
  },
};

export const darkTheme: Theme = {
  dark: true,
  color: {
    bg: "#0F1613",
    surface: "#182019",
    surfaceAlt: "#212B23",
    border: "#2C382F",
    text: "#EDF2EC",
    textMuted: "#A7B4A9",
    textFaint: "#75837A",
    primary: "#5FBF9E",
    primarySoft: "#143528",
    onPrimarySoft: "#A7D9C6",
    onPrimary: "#06251A",
    accent: "#E89A66",
    danger: "#F08C7D",
    dangerSoft: "#3A1B18",
    overlay: "rgba(12,14,18,0.72)",
    onOverlay: "#FFFFFF",
  },
};

/* Avstånd ----------------------------------------------------------------- */

/**
 * Fyrapunktsskala, men inte varje steg, bara de tio som designen faktiskt
 * använder. En skala med alla värden mellan 4 och 40 är ingen skala.
 */
export const space = {
  xs: 4,
  sm: 8,
  smd: 10,
  md: 12,
  mdl: 14,
  lg: 16,
  lgx: 18,
  xl: 20,
  xxl: 26,
  xxxl: 34,
} as const;

/** Skärmarnas sidmarginal. Samma överallt. */
export const SCREEN_PADDING = space.xl;

/* Radier ------------------------------------------------------------------ */

export const radius = {
  /** Fält och listgrupper. */
  field: 14,
  /** Chattbubbla. */
  bubble: 14,
  /** Kort. */
  card: 18,
  /** Innehållsyta som lyfter över ett foto, bara upptill. */
  sheet: 22,
  /** Knappar, chips, badges, avatarer. */
  pill: 999,
} as const;

/* Typografi --------------------------------------------------------------- */

/**
 * Skalan i sin helhet. `micro` är versalt med spärr och används till
 * sektionsetiketter, den är avsiktligt liten och tung nog att bära det.
 */
export const font = {
  display: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 24,
    lineHeight: 32,
  },
  title: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 18,
    lineHeight: 24,
  },
  heading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 14,
    lineHeight: 20,
  },
  logo: {
    fontFamily: fontFamily.displayBold,
    fontSize: 16,
    letterSpacing: 0.32,
  },
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    lineHeight: 22,
  },
  small: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  smallStrong: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    lineHeight: 18,
  },
  micro: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.66,
    textTransform: "uppercase",
  },
  button: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
  },
} as const satisfies Record<string, TextStyle>;

/* Skuggor ----------------------------------------------------------------- */

/**
 * Kortskugga för ljust läge.
 *
 * Mörkt läge har **ingen** skugga, där gör kanten jobbet. En skugga mot mörk
 * botten syns ändå inte, den gör bara ytan smutsig.
 */
export const cardShadow = Platform.select({
  ios: {
    shadowColor: "#14201B",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 3 },
  default: {},
}) as object;

export function shadowFor(theme: Theme): object {
  return theme.dark ? {} : cardShadow;
}
