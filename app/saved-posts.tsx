
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';
import { spacing, typography } from '@/styles/commonStyles';
import { PostCard } from '@/components/PostCard';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import { Post } from '@/types';

export default function SavedPostsScreen() {
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();
    const colors = isDark ? darkColors : lightColors;

    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const loadSavedPosts = useCallback(async (pageNum = 1, refresh = false) => {
        try {
            if (refresh) {
                setIsRefreshing(true);
            } else if (pageNum === 1) {
                setIsLoading(true);
            }

            const response = await apiClient.getSavedPosts(pageNum, 20);
            const posts = response.data || [];

            if (refresh || pageNum === 1) {
                setSavedPosts(posts);
            } else {
                setSavedPosts((prev) => [...prev, ...posts]);
            }

            setHasMore(response.hasMore ?? false);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to load saved posts:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadSavedPosts();
    }, [loadSavedPosts]);

    const handleRefresh = useCallback(() => {
        loadSavedPosts(1, true);
    }, [loadSavedPosts]);

    const handleLoadMore = useCallback(() => {
        if (!isLoading && hasMore) {
            loadSavedPosts(page + 1);
        }
    }, [isLoading, hasMore, page, loadSavedPosts]);

    const renderPost = useCallback(({ item }: { item: Post }) => (
        <PostCard post={item} />
    ), []);

    const renderEmpty = useCallback(() => (
        <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
            <IconSymbol
                ios_icon_name="bookmark"
                android_material_icon_name="bookmark-border"
                size={64}
                color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved posts</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tap the bookmark icon on any post to save it for later
            </Text>
        </View>
    ), [colors]);

    const renderFooter = useCallback(() => {
        if (!isLoading || page === 1) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }, [isLoading, page, colors]);

    if (isLoading && page === 1) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen
                    options={{
                        title: 'Saved Posts',
                        headerStyle: { backgroundColor: colors.background },
                        headerTintColor: colors.text,
                    }}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    title: 'Saved Posts',
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
            />

            <FlatList
                data={savedPosts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContainer,
                    { paddingBottom: insets.bottom + 20 },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        paddingTop: spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
        marginTop: 100,
    },
    emptyTitle: {
        ...typography.h2,
        marginTop: spacing.lg,
    },
    emptyText: {
        ...typography.body,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    footer: {
        padding: spacing.md,
        alignItems: 'center',
    },
});
