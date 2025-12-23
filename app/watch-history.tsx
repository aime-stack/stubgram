
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { colors, typography } from '@/styles/commonStyles';

export default function WatchHistoryScreen() {
    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Watch History' }} />
            <Text style={styles.text}>Watch History Screen</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        ...typography.h3,
        color: colors.text,
    },
});
