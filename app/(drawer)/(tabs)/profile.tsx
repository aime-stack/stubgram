
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { PostCard } from '@/components/PostCard';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Post } from '@/types';

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, isAuthenticated } = useAuthStore();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadProfileData = useCallback(async () => {
        if (!user) return;
        try {
            setIsLoading(true);
            // Fetch user's posts
            const response = await apiClient.getUserPosts(user.id);
            setPosts(response.data || []);
        } catch (error) {
            console.error('Failed to load profile data:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        if (isAuthenticated) {
            loadProfileData();
        }
    }, [isAuthenticated, loadProfileData]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadProfileData();
    };

    const renderHeader = () => {
        if (!user) return null;
        return (
            <View style={styles.headerContainer}>
                {/* Cover Image */}
                <View style={styles.coverImageContainer}>
                    <Image
                        source={{ uri: 'https://via.placeholder.com/600x200' }}
                        style={styles.coverImage}
                    />
                </View>

                <View style={styles.profileHeaderContent}>
                    <View style={styles.avatarRow}>
                        <Image
                            source={{ uri: user.avatar || 'https://via.placeholder.com/100' }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <Text style={styles.editButtonText}>Edit Profile</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.username}>{user.username || 'User'}</Text>
                    <Text style={styles.handle}>@{user.username?.toLowerCase() || 'handle'}</Text>

                    {user.bio && (
                        <Text style={styles.bio}>{user.bio}</Text>
                    )}

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{user.followingCount || 0}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{user.followersCount || 0}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </View>
                    </View>
                </View>

                {/* Tabs for Tweets/Replies/Media/Likes could go here */}
                <View style={styles.tabRow}>
                    <View style={styles.activeTab}>
                        <Text style={styles.activeTabText}>Posts</Text>
                        <View style={styles.activeTabIndicator} />
                    </View>
                    <View style={styles.inactiveTab}>
                        <Text style={styles.inactiveTabText}>Replies</Text>
                    </View>
                    <View style={styles.inactiveTab}>
                        <Text style={styles.inactiveTabText}>Media</Text>
                    </View>
                    <View style={styles.inactiveTab}>
                        <Text style={styles.inactiveTabText}>Likes</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderPost = ({ item }: { item: Post }) => (
        <PostCard post={item} />
    );

    if (!isAuthenticated) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
                <Text>Please log in to view profile.</Text>
            </View>
        )
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
                }
                contentContainerStyle={{ paddingBottom: 100 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerContainer: {
        backgroundColor: colors.background,
    },
    coverImageContainer: {
        height: 150,
        backgroundColor: colors.primary,
    },
    coverImage: {
        width: '100%',
        height: '100%',
        opacity: 0.8,
    },
    profileHeaderContent: {
        paddingHorizontal: spacing.md,
        marginTop: -40, // Overlap avatar
    },
    avatarRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: spacing.sm,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: colors.background,
        backgroundColor: colors.background,
    },
    editButton: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        marginBottom: 10,
    },
    editButtonText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    username: {
        ...typography.h2,
        color: colors.text,
        marginBottom: 2,
    },
    handle: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    bio: {
        ...typography.body,
        color: colors.text,
        marginBottom: spacing.md,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginBottom: spacing.md,
    },
    statItem: {
        flexDirection: 'row',
        gap: 4,
    },
    statNumber: {
        fontWeight: '700',
        color: colors.text,
    },
    statLabel: {
        color: colors.textSecondary,
    },
    tabRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginTop: spacing.sm,
    },
    activeTab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        position: 'relative',
    },
    activeTabText: {
        fontWeight: '700',
        color: colors.text,
    },
    activeTabIndicator: {
        position: 'absolute',
        bottom: 0,
        width: 40,
        height: 4,
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    inactiveTab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    inactiveTabText: {
        fontWeight: '600',
        color: colors.textSecondary,
    },
});
