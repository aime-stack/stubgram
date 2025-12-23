
import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
// import { DrawerActions } from '@react-navigation/native'; // Deprecated in direct usage, use navigation prop or event
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

export default function TabLayout() {
    const insets = useSafeAreaInsets();

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
                            android_material_icon_name={focused ? "home" : "home"}
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
                            android_material_icon_name={focused ? "monetization-on" : "monetization-on"}
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
                            android_material_icon_name={focused ? "chat" : "chat"}
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
                            android_material_icon_name={focused ? "person" : "person"}
                            size={28}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
