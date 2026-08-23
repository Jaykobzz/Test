import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { font, fontFamily } from "@/theme";

export default function TabsLayout() {
  const theme = useTheme();

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
          title: "Upptäck",
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="aktiviteter"
        options={{
          title: "Mina",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chattar"
        options={{
          title: "Chattar",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
