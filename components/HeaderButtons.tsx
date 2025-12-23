
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";

export function HeaderRightButton() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/create-post')}
      style={styles.headerButtonContainer}
    >
      <IconSymbol 
        ios_icon_name="plus" 
        android_material_icon_name="add" 
        color={theme.colors.primary} 
      />
    </Pressable>
  );
}

export function HeaderLeftButton() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/settings')}
      style={styles.headerButtonContainer}
    >
      <IconSymbol 
        ios_icon_name="gear" 
        android_material_icon_name="settings" 
        color={theme.colors.primary} 
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerButtonContainer: {
    padding: 6,
  },
});
