/**
 * Roten. Håller providers och avgör vart användaren ska skickas:
 * inte inloggad -> BankID, inloggad men halvfärdig profil -> onboarding,
 * annars in i appen.
 */

import {
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from "@expo-google-fonts/hanken-grotesk";
import {
  Unbounded_600SemiBold,
  Unbounded_700Bold,
} from "@expo-google-fonts/unbounded";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { Loading } from "@/components/ui";
import { darkTheme, lightTheme } from "@/theme";

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;

  // Utan detta finns typsnitten aldrig i appen och varje fontFamily i temat
  // faller tyst tillbaka på systemfonten. Inget kraschar, det ser bara fel ut.
  const [fontsLoaded] = useFonts({
    Unbounded_600SemiBold,
    Unbounded_700Bold,
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style={theme.dark ? "light" : "dark"} />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { loading, profile } = useAuth();
  // useSegments() typas som en tuple; vi vill bara läsa av de två första nivåerna.
  const segments = useSegments() as string[];
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;

  useEffect(() => {
    if (loading) return;

    const inAuthFlow = segments[0] === "(auth)";
    const needsOnboarding = profile?.needsOnboarding ?? false;
    const onOnboarding = segments[1] === "onboarding";

    if (!profile && !inAuthFlow) {
      router.replace("/(auth)/login");
    } else if (profile && needsOnboarding && !onOnboarding) {
      router.replace("/(auth)/onboarding");
    } else if (profile && !needsOnboarding && inAuthFlow) {
      router.replace("/(tabs)");
    }
  }, [loading, profile, segments, router]);

  if (loading) return <Loading label="Laddar Haka på …" />;

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.color.bg },
        headerTintColor: theme.color.text,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: theme.color.bg },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="aktivitet/ny" options={{ title: "Ny aktivitet", presentation: "modal" }} />
      <Stack.Screen name="aktivitet/[id]" options={{ title: "" }} />
      <Stack.Screen name="chatt/[id]" options={{ title: "" }} />
      <Stack.Screen name="person/[id]" options={{ title: "" }} />
      <Stack.Screen
        name="igen/[activityId]"
        options={{ title: "Göra om det?", presentation: "modal" }}
      />
      <Stack.Screen name="kompisar" options={{ title: "Kompisar" }} />
    </Stack>
  );
}
