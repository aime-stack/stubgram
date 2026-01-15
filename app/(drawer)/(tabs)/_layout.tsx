
import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';
import { IconSymbol } from '@/components/IconSymbol';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const colors = isDark ? darkColors : lightColors;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom + 10,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? "house.fill" : "house"}
              android_material_icon_name={focused ? "home" : "other-houses"}
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? "play.rectangle.fill" : "play.rectangle"}
              android_material_icon_name={focused ? "play-circle-filled" : "play-circle-outline"}
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? "magnifyingglass.circle.fill" : "magnifyingglass"}
              android_material_icon_name={focused ? "explore" : "explore"}
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? "banknote.fill" : "banknote"}
              android_material_icon_name={focused ? "monetization-on" : "attach-money"}
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? "message.fill" : "message"}
              android_material_icon_name={focused ? "chat" : "chat-bubble"}
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? "person.fill" : "person"}
              android_material_icon_name={focused ? "person" : "perm-identity"}
              size={28}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
