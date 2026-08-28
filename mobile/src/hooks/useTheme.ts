import { useColorScheme } from "react-native";

import { darkTheme, lightTheme, type Theme } from "@/theme";

/** Följer systemets ljus/mörkerläge. */
export function useTheme(): Theme {
  return useColorScheme() === "dark" ? darkTheme : lightTheme;
}
