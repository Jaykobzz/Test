import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { t } from "@/i18n";
import { useUnread } from "@/hooks/useUnread";
import { font, fontFamily } from "@/theme";

export default function TabsLayout() {
  const theme = useTheme();
  const unread = useUnread();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.textFaint,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.color.border,
        },
        tabBarLabelStyle: {
          fontSize: font.micro.fontSize,
          fontFamily: fontFamily.bodySemi,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.nav.discover,
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="aktiviteter"
        options={{
          title: t.nav.mine,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chattar"
        options={{
          title: t.nav.chats,
          // Siffran är det enda i appen som ber om uppmärksamhet av sig
          // självt, så den finns bara när den betyder något.
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.color.accent,
            fontFamily: fontFamily.bodyBold,
            fontSize: 11,
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: t.nav.profile,
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
