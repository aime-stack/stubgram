
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
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'reels' | 'media' | 'likes'>('posts');

    const loadProfileData = useCallback(async (isInitial = false) => {
        if (!user) return;
        try {
            setIsLoading(true);
            if (isInitial) {
                setPosts([]);
            }
            let response;
            switch (activeTab) {
                case 'posts':
                    response = await apiClient.getUserPosts(user.id);
                    break;
                case 'replies':
                    response = await apiClient.getUserReplies(user.id);
                    break;
                case 'reels':
                    response = await apiClient.getUserPosts(user.id);
                    // Filter for reels only if the API doesn't have a dedicated endpoint yet
                    response.data = response.data.filter((p: any) => p.type === 'reel');
                    break;
                case 'media':
                    response = await apiClient.getUserMedia(user.id);
                    break;
                case 'likes':
                    response = await apiClient.getUserLikes(user.id);
                    break;
                default:
                    response = { data: [] };
            }
            setPosts(response.data || []);
        } catch (error) {
            console.error('Failed to load profile data:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user, activeTab]);

    useEffect(() => {
        if (isAuthenticated) {
            loadProfileData(true); // Initial load
            // Refresh current user data to ensure counts/cover are accurate
            apiClient.getMe().then(response => {
                if (response.data) {
                    useAuthStore.getState().updateUser(response.data);
                }
            }).catch(err => console.error('Failed to refresh user profile:', err));
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated && !isRefreshing) {
            loadProfileData(false); // Tab switch load (don't clear posts)
        }
    }, [activeTab]);

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
                        source={{ uri: user.coverPhoto || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800' }}
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

                    <View style={styles.profileCard}>
                        <Text style={styles.username}>{user.username || 'User'}</Text>
                        <Text style={styles.handle}>@{user.username?.toLowerCase() || 'handle'}</Text>

                        {user.bio && (
                            <Text style={styles.bio}>{user.bio}</Text>
                        )}

                        <View style={styles.statsRow}>
                            <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/user/following/${user.id}` as any)}>
                                <Text style={styles.statNumber}>{user.followingCount || 0}</Text>
                                <Text style={styles.statLabel}>Following</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/user/followers/${user.id}` as any)}>
                                <Text style={styles.statNumber}>{user.followersCount || 0}</Text>
                                <Text style={styles.statLabel}>Followers</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabRow}>
                    <TouchableOpacity
                        style={activeTab === 'posts' ? styles.activeTab : styles.inactiveTab}
                        onPress={() => setActiveTab('posts')}
                    >
                        <Text style={activeTab === 'posts' ? styles.activeTabText : styles.inactiveTabText}>Posts</Text>
                        {activeTab === 'posts' && <View style={styles.activeTabIndicator} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={activeTab === 'reels' ? styles.activeTab : styles.inactiveTab}
                        onPress={() => setActiveTab('reels')}
                    >
                        <Text style={activeTab === 'reels' ? styles.activeTabText : styles.inactiveTabText}>Reels</Text>
                        {activeTab === 'reels' && <View style={styles.activeTabIndicator} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={activeTab === 'replies' ? styles.activeTab : styles.inactiveTab}
                        onPress={() => setActiveTab('replies')}
                    >
                        <Text style={activeTab === 'replies' ? styles.activeTabText : styles.inactiveTabText}>Replies</Text>
                        {activeTab === 'replies' && <View style={styles.activeTabIndicator} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={activeTab === 'media' ? styles.activeTab : styles.inactiveTab}
                        onPress={() => setActiveTab('media')}
                    >
                        <Text style={activeTab === 'media' ? styles.activeTabText : styles.inactiveTabText}>Media</Text>
                        {activeTab === 'media' && <View style={styles.activeTabIndicator} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={activeTab === 'likes' ? styles.activeTab : styles.inactiveTab}
                        onPress={() => setActiveTab('likes')}
                    >
                        <Text style={activeTab === 'likes' ? styles.activeTabText : styles.inactiveTabText}>Likes</Text>
                        {activeTab === 'likes' && <View style={styles.activeTabIndicator} />}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderPost = ({ item }: { item: any }) => {
        // Handle specific tab views
        if (activeTab === 'reels' || activeTab === 'media') {
            const isReel = activeTab === 'reels' || item.type === 'reel';
            return (
                <TouchableOpacity
                    style={[styles.mediaItem, isReel && styles.reelGridItem]}
                    onPress={() => router.push(isReel ? `/reels?id=${item.id}` as any : `/post/${item.id}` as any)}
                >
                    <Image 
                        source={{ uri: item.thumbnailUrl || item.mediaUrl || item.videoUrl }} 
                        style={styles.mediaThumbnail} 
                        resizeMode="cover"
                    />
                    {isReel && (
                        <View style={styles.mediaTypeIcon}>
                            <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={14} color="#FFF" />
                        </View>
                    )}
                </TouchableOpacity>
            );
        }
        return <PostCard post={item} />;
    };

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
                numColumns={activeTab === 'reels' || activeTab === 'media' ? 3 : 1}
                key={activeTab === 'reels' || activeTab === 'media' ? 'grid' : 'list'}
                renderItem={renderPost}
                keyExtractor={(item, index) => `${activeTab}-${item.id || index}-${index}`}
                ListHeaderComponent={renderHeader}
                ListHeaderComponentStyle={{ marginBottom: spacing.md }}
                ListFooterComponent={() => (
                    isLoading && posts.length > 0 ? (
                        <ActivityIndicator style={{ padding: spacing.md }} color={colors.primary} />
                    ) : (
                        <View style={{ height: 100 }} />
                    )
                )}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
                }
                contentContainerStyle={{ paddingBottom: 100 }}
                extraData={activeTab}
                ListEmptyComponent={() => (
                    !isLoading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No {activeTab} yet</Text>
                        </View>
                    ) : (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    )
                )}
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
    profileCard: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginTop: spacing.md,
        ...{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
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
        fontWeight: '500',
        color: colors.textSecondary,
    },
    mediaItem: {
        width: '33.33%',
        aspectRatio: 1,
        padding: 1,
    },
    reelGridItem: {
        aspectRatio: 2/3,
    },
    mediaThumbnail: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.border,
    },
    mediaTypeIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        paddingVertical: spacing.xxl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    loadingContainer: {
        paddingVertical: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
