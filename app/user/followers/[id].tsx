
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import { User } from '@/types';

export default function FollowersScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadFollowers = useCallback(async () => {
        try {
            const response = await apiClient.getFollowers(id);
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to load followers:', error);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadFollowers();
    }, [loadFollowers]);

    const renderUser = ({ item }: { item: User }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => router.push(`/user/${item.id}`)}
        >
            <Image
                source={{ uri: item.avatar || 'https://via.placeholder.com/50' }}
                style={styles.avatar}
            />
            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.username}</Text>
                    {item.isVerified && (
                        <IconSymbol
                            ios_icon_name="checkmark.seal.fill"
                            android_material_icon_name="verified"
                            size={16}
                            color={colors.primary}
                        />
                    )}
                </View>
                {item.full_name && <Text style={styles.fullName}>{item.full_name}</Text>}
                <Text style={styles.bio} numberOfLines={1}>{item.bio || 'No bio available'}</Text>
            </View>
            <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
            />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <Stack.Screen
                options={{
                    title: 'Followers',
                    headerShown: true,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerShadowVisible: false,
                }}
            />

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderUser}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <IconSymbol
                                ios_icon_name="person.2"
                                android_material_icon_name="people-outline"
                                size={64}
                                color={colors.textSecondary}
                            />
                            <Text style={styles.emptyText}>No followers yet</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: spacing.md,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.border,
        marginRight: spacing.md,
    },
    info: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: 2,
    },
    name: {
        ...typography.body,
        fontWeight: '700',
        color: colors.text,
    },
    fullName: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    bio: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl * 2,
    },
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
});
