
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { PremiumHeader } from '@/components/PremiumHeader';
import { apiClient } from '@/services/api';

export default function ChatScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [conversations, setConversations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadConversations = async () => {
        try {
            const { data } = await apiClient.getConversations();
            setConversations(data);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadConversations();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadConversations();
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => router.push(`/conversation/${item.otherUser.id}` as any)}
        >
            <Image source={{ uri: item.otherUser.avatar || 'https://via.placeholder.com/50' }} style={styles.avatar} />
            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={styles.username}>{item.otherUser.username}</Text>
                    <Text style={styles.time}>
                        {new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage?.content || 'Click to view conversation'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader 
                title="Messages"
                subtitle="Your private conversations"
                showBackButton={false}
                iosIconName="bubble.left.and.bubble.right.fill"
                androidIconName="forum"
            />

            {isLoading ? (
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <IconSymbol ios_icon_name="bubble.left" android_material_icon_name="chat-bubble-outline" size={48} color={colors.textSecondary} />

                            <Text style={styles.emptyText}>No messages yet</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity style={styles.fab}>
                <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="mail" size={24} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    premiumHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        paddingBottom: spacing.md,
    },
    premiumTitle: {
        ...typography.h1,
        color: colors.text,
    },
    premiumSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: 2,
    },
    settingsButton: {
        padding: spacing.sm,
    },
    listContent: {
        padding: spacing.md,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.border,
        marginRight: spacing.md,
    },
    chatInfo: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    username: {
        ...typography.body,
        fontWeight: '700',
        color: colors.text,
    },
    time: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    lastMessage: {
        ...typography.body,
        color: colors.textSecondary,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: spacing.xxl,
        gap: spacing.md,
    },
    emptyText: {
        color: colors.textSecondary,
        ...typography.body,
    },
    fab: {
        position: 'absolute',
        right: spacing.lg,
        bottom: spacing.lg + 60, // Above tab bar
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
});
