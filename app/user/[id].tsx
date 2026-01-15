
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { PostCard } from '@/components/PostCard';
import { User, Post } from '@/types';
import { apiClient } from '@/services/api';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import { ImageModal } from '@/components/ImageModal';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'replies' | 'media' | 'likes'>('posts');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const isMe = currentUser?.id === id;

  const loadUserProfile = useCallback(async () => {
    try {
      const response = await apiClient.getUserProfile(id);
      setUser(response.data);
      setIsFollowing(response.data.isFollowing || false);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadTabData = useCallback(async (isInitial = false) => {
    if (!id) return;
    setIsDataLoading(true);

    // Only clear posts if it's the initial load for a new user
    if (isInitial) {
      setPosts([]);
    }

    try {
      let response;
      switch (activeTab) {
        case 'posts':
          response = await apiClient.getUserPosts(id);
          break;
        case 'reels':
          response = await apiClient.getUserPosts(id);
          response.data = response.data.filter(p => p.type === 'reel');
          break;
        case 'replies':
          response = await apiClient.getUserReplies(id);
          break;
        case 'media':
          response = await apiClient.getUserMedia(id);
          break;
        case 'likes':
          response = await apiClient.getUserLikes(id);
          break;
        default:
          response = { data: [] };
      }
      setPosts(response.data);
    } catch (error) {
      console.error(`Failed to load ${activeTab}:`, error);
    } finally {
      setIsDataLoading(false);
    }
  }, [id, activeTab]);

  useEffect(() => {
    loadUserProfile();
    loadTabData(true); // Initial load for this user
  }, [id, loadUserProfile]);

  useEffect(() => {
    // Tab switch load (don't clear posts immediately to prevent pop)
    if (!isLoading) {
      loadTabData(false);
    }
  }, [activeTab]);

  const handleFollow = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (isFollowing) {
        await apiClient.unfollowUser(id);
      } else {
        await apiClient.followUser(id);
      }

      setIsFollowing(!isFollowing);
      // Re-fetch profile to get updated counts
      await loadUserProfile();
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  }, [isFollowing, id, loadUserProfile]);

  const handleMessage = useCallback(() => {
    router.push(`/conversation/${id}`);
  }, [router, id]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon}>
          <IconSymbol ios_icon_name="ellipsis" android_material_icon_name="more-vert" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
      >
        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: user.coverPhoto || 'https://images.unsplash.com/photo-1557683316-973673baf926' }}
            style={styles.coverPhoto}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <Image
                source={{ uri: user.avatar || 'https://via.placeholder.com/100' }}
                style={styles.avatar}
              />
              {isMe && (
                <TouchableOpacity
                  style={styles.profileActionButton}
                  onPress={() => router.push('/edit-profile')}
                >
                  <Text style={styles.profileActionButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              )}
              {!isMe && (
                <View style={styles.otherUserActions}>
                  <TouchableOpacity
                    style={[styles.profileActionButton, isFollowing && styles.followingButton]}
                    onPress={handleFollow}
                  >
                    <Text style={[styles.profileActionButtonText, isFollowing && styles.followingButtonText]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.roundActionButton} onPress={handleMessage}>
                    <IconSymbol ios_icon_name="envelope" android_material_icon_name="mail-outline" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.nameContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.username}>{user.full_name || user.username}</Text>
                {user.account_type === 'premium' && (
                  <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={20} color={colors.primary} />
                )}
                {(user.account_type === 'vip' || user.account_type === 'industry') && (
                  <IconSymbol ios_icon_name="star.circle.fill" android_material_icon_name="stars" size={20} color="#FFD700" />
                )}
              </View>
              <Text style={styles.handle}>@{user.username.toLowerCase()}</Text>

              {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

              <View style={styles.joinDate}>
                <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar-today" size={14} color={colors.textSecondary} />
                <Text style={styles.joinDateText}>
                  Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/user/following/${id}` as any)}>
                <Text style={styles.statValue}>{user.followingCount}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/user/followers/${id}` as any)}>
                <Text style={styles.statValue}>{user.followersCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reels' && styles.tabActive]}
            onPress={() => setActiveTab('reels')}
          >
            <Text style={[styles.tabText, activeTab === 'reels' && styles.tabTextActive]}>Reels</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'replies' && styles.tabActive]}
            onPress={() => setActiveTab('replies')}
          >
            <Text style={[styles.tabText, activeTab === 'replies' && styles.tabTextActive]}>Replies</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'media' && styles.tabActive]}
            onPress={() => setActiveTab('media')}
          >
            <Text style={[styles.tabText, activeTab === 'media' && styles.tabTextActive]}>Media</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'likes' && styles.tabActive]}
            onPress={() => setActiveTab('likes')}
          >
            <Text style={[styles.tabText, activeTab === 'likes' && styles.tabTextActive]}>Likes</Text>
          </TouchableOpacity>
        </View>

        {/* Posts/Reels Content */}
        <View style={activeTab === 'reels' ? styles.reelsGrid : styles.postsContainer}>
          {isDataLoading ? (
            <View style={styles.tabLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="photo.on.rectangle.angled"
                android_material_icon_name="photo-library"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No {activeTab} yet</Text>
            </View>
          ) : (activeTab === 'reels' || activeTab === 'media') ? (
            <View style={styles.reelsGrid}>
              {posts.map((post, index) => {
                const isReel = post.type === 'reel' || post.type === 'video';
                return (
                  <TouchableOpacity
                    key={`${activeTab}-${post.id || index}-${index}`}
                    style={styles.reelThumbnailContainer}
                    onPress={() => {
                      if (isReel) {
                        router.push({ pathname: '/(drawer)/(tabs)/reels', params: { id: post.id } });
                      } else {
                        setSelectedImageUrl(post.mediaUrl || null);
                      }
                    }}
                  >
                    <Image
                      source={{ uri: post.thumbnailUrl || post.mediaUrl || 'https://via.placeholder.com/150' }}
                      style={styles.reelThumbnail}
                    />
                    {isReel && (
                      <View style={styles.reelViews}>
                        <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={12} color="#FFF" />
                        <Text style={styles.reelViewsText}>{post.viewsCount || 0}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            posts.map((post, index) => (
              <PostCard key={`${activeTab}-${post.id}-${index}`} post={post} />
            ))
          )}
        </View>
      </ScrollView>

      <ImageModal
        visible={!!selectedImageUrl}
        imageUrl={selectedImageUrl || ''}
        onClose={() => setSelectedImageUrl(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 40 : spacing.md,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)', // Lighter icon background for light theme
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverContainer: {
    height: 160,
    width: '100%',
    backgroundColor: colors.border,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileSection: {
    // Removed marginTop: -40 as profileCard now handles it
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: -40,
    marginHorizontal: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: colors.background,
    backgroundColor: colors.border,
  },
  headerActions: {
    paddingBottom: 4,
  },
  otherUserActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  profileActionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
    alignItems: 'center',
  },
  profileActionButtonText: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.text,
  },
  followingButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  followingButtonText: {
    color: '#FFF',
  },
  roundActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameContainer: {
    marginBottom: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  handle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  bio: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  joinDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  joinDateText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.text,
  },
  statLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  postsContainer: {
    flex: 1,
  },
  tabLoading: {
    padding: spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  reelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 1,
  },
  reelThumbnailContainer: {
    width: '33.33%',
    aspectRatio: 9 / 16,
    padding: 1,
    position: 'relative',
  },
  reelThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
  },
  reelViews: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reelViewsText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
