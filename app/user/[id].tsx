
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { PostCard } from '@/components/PostCard';
import { User, Post } from '@/types';
import { apiClient } from '@/services/api';
import * as Haptics from 'expo-haptics';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'media'>('posts');

  const loadUserProfile = useCallback(async () => {
    try {
      // TODO: Backend Integration - Fetch user profile
      const response = await apiClient.getUserProfile(id);
      setUser(response.data);
      setIsFollowing(response.data.isFollowing || false);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadUserPosts = useCallback(async () => {
    try {
      // TODO: Backend Integration - Fetch user posts
      const response = await apiClient.getUserPosts(id);
      setPosts(response.data.data);
    } catch (error) {
      console.error('Failed to load user posts:', error);
    }
  }, [id]);

  useEffect(() => {
    loadUserProfile();
    loadUserPosts();
  }, [id, loadUserProfile, loadUserPosts]);

  const handleFollow = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsFollowing(!isFollowing);
      
      // TODO: Backend Integration - Follow/unfollow user
      await apiClient.followUser(id);
      
      if (user) {
        setUser({
          ...user,
          followersCount: isFollowing ? user.followersCount - 1 : user.followersCount + 1,
        });
      }
    } catch (error) {
      console.error('Failed to follow user:', error);
      setIsFollowing(!isFollowing);
    }
  }, [isFollowing, id, user]);

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{user.username}</Text>
        <TouchableOpacity style={styles.backButton}>
          <IconSymbol
            ios_icon_name="ellipsis"
            android_material_icon_name="more_vert"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: user.avatar || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.username}>{user.username}</Text>
              {user.isVerified && (
                <IconSymbol
                  ios_icon_name="checkmark.seal.fill"
                  android_material_icon_name="verified"
                  size={20}
                  color={colors.primary}
                />
              )}
              {user.isCelebrity && (
                <View style={styles.celebrityBadge}>
                  <IconSymbol
                    ios_icon_name="star.fill"
                    android_material_icon_name="star"
                    size={16}
                    color={colors.accent}
                  />
                </View>
              )}
            </View>
            {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.postsCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/followers/${id}`)}
            >
              <Text style={styles.statValue}>{user.followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/following/${id}`)}
            >
              <Text style={styles.statValue}>{user.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.followButton]}
              onPress={handleFollow}
            >
              <LinearGradient
                colors={isFollowing ? [colors.card, colors.card] : [colors.primary, colors.secondary]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.actionButtonText, isFollowing && styles.followingText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.messageButton]}
              onPress={handleMessage}
            >
              <IconSymbol
                ios_icon_name="message"
                android_material_icon_name="chat"
                size={20}
                color={colors.text}
              />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <IconSymbol
              ios_icon_name="square.grid.2x2"
              android_material_icon_name="grid_view"
              size={24}
              color={activeTab === 'posts' ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'media' && styles.tabActive]}
            onPress={() => setActiveTab('media')}
          >
            <IconSymbol
              ios_icon_name="photo"
              android_material_icon_name="photo_library"
              size={24}
              color={activeTab === 'media' ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Posts */}
        <View style={styles.postsContainer}>
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="photo.on.rectangle.angled"
                android_material_icon_name="photo_library"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          ) : (
            posts.map((post, index) => (
              <PostCard key={index} post={post} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.xxl + 20 : spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  profileHeader: {
    padding: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  nameContainer: {
    marginBottom: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  username: {
    ...typography.h2,
    color: colors.text,
  },
  celebrityBadge: {
    backgroundColor: `${colors.accent}20`,
    borderRadius: borderRadius.full,
    padding: spacing.xs,
  },
  bio: {
    ...typography.body,
    color: colors.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  followButton: {
    flex: 2,
  },
  buttonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  followingText: {
    color: colors.text,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  messageButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  postsContainer: {
    padding: spacing.md,
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
