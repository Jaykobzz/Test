/**
 * Designsystem för FRIEND.
 *
 * Varmt och lite folkligt snarare än svalt och korporativt — appen handlar om
 * att våga höra av sig till någon man inte känner, och gränssnittet ska kännas
 * som en inbjudan, inte som en myndighet.
 */

import { Platform } from "react-native";

const palette = {
  ember: "#F26B3A",
  emberDark: "#D4531F",
  emberSoft: "#FFE8DE",
  pine: "#1E6F5C",
  pineSoft: "#DCEFE8",
  sun: "#F5B841",
  sunSoft: "#FFF2D6",
  ink: "#16181D",
  slate: "#5A6172",
  mist: "#8B93A5",
  hairline: "#E6E2DD",
  cream: "#FFFAF6",
  paper: "#FFFFFF",
  danger: "#C9382B",
  dangerSoft: "#FBE4E1",

  nightInk: "#F2F0ED",
  nightSlate: "#A8B0C0",
  nightMist: "#6E7789",
  nightHairline: "#2A2E38",
  nightBase: "#101218",
  nightPaper: "#191C24",
} as const;

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
    primaryPressed: string;
    primarySoft: string;
    onPrimary: string;
    accent: string;
    accentSoft: string;
    highlight: string;
    highlightSoft: string;
    danger: string;
    dangerSoft: string;
  };
}

export const lightTheme: Theme = {
  dark: false,
  color: {
    bg: palette.cream,
    surface: palette.paper,
    surfaceAlt: "#F6F1EC",
    border: palette.hairline,
    text: palette.ink,
    textMuted: palette.slate,
    textFaint: palette.mist,
    primary: palette.ember,
    primaryPressed: palette.emberDark,
    primarySoft: palette.emberSoft,
    onPrimary: "#FFFFFF",
    accent: palette.pine,
    accentSoft: palette.pineSoft,
    highlight: palette.sun,
    highlightSoft: palette.sunSoft,
    danger: palette.danger,
    dangerSoft: palette.dangerSoft,
  },
};

export const darkTheme: Theme = {
  dark: true,
  color: {
    bg: palette.nightBase,
    surface: palette.nightPaper,
    surfaceAlt: "#22262F",
    border: palette.nightHairline,
    text: palette.nightInk,
    textMuted: palette.nightSlate,
    textFaint: palette.nightMist,
    primary: "#FF7E52",
    primaryPressed: "#E46535",
    primarySoft: "#3A2419",
    onPrimary: "#1A0D06",
    accent: "#4FB79A",
    accentSoft: "#16302A",
    highlight: "#F5C765",
    highlightSoft: "#33290F",
    danger: "#F0685A",
    dangerSoft: "#3A1B18",
  },
};

/** 4-punktsskala. Allt avstånd i appen kommer härifrån. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const font = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "800" },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
  small: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  smallStrong: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  micro: { fontSize: 11, lineHeight: 15, fontWeight: "600" },
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: "#2A1B12",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 3 },
  default: {},
}) as object;
