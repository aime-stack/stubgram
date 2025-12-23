
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { PostCard } from '@/components/PostCard';
import { IconSymbol } from '@/components/IconSymbol';
import { Post } from '@/types';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // TODO: Backend Integration - Fetch personalized feed
      const response = await apiClient.getFeed(pageNum, 10);
      const newPosts = response.data.data;

      if (refresh || pageNum === 1) {
        setPosts(newPosts);
      } else {
        setPosts((prevPosts) => [...prevPosts, ...newPosts]);
      }

      setHasMore(response.data.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load feed:', error);
      // Show mock data for development
      if (pageNum === 1) {
        setPosts(getMockPosts());
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        // Use replace to avoid navigation stack issues
        router.replace('/(auth)/login');
      } else {
        // Load feed when authenticated
        loadFeed();
      }
    }
  }, [isAuthenticated, authLoading]);

  const handleRefresh = useCallback(() => {
    loadFeed(1, true);
  }, [loadFeed]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadFeed(page + 1);
    }
  }, [isLoading, hasMore, page, loadFeed]);

  const handleCreatePost = useCallback(() => {
    router.push('/create-post');
  }, [router]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard post={item} />
  ), []);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <IconSymbol
        ios_icon_name="photo.on.rectangle.angled"
        android_material_icon_name="photo_library"
        size={64}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={styles.emptyText}>
        Follow users to see their posts in your feed
      </Text>
    </View>
  ), []);

  const renderFooter = useCallback(() => {
    if (!isLoading || page === 1) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }, [isLoading, page]);

  if (authLoading || (isLoading && page === 1)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.listContainer}
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

      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreatePost}
        activeOpacity={0.8}
      >
        <IconSymbol
          ios_icon_name="plus"
          android_material_icon_name="add"
          size={28}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );
}

// Mock data for development
function getMockPosts(): Post[] {
  return [
    {
      id: '1',
      userId: '1',
      user: {
        id: '1',
        username: 'johndoe',
        email: 'john@example.com',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        isVerified: true,
        isCelebrity: false,
        followersCount: 1234,
        followingCount: 567,
        postsCount: 89,
        createdAt: new Date().toISOString(),
      },
      type: 'text',
      content: 'Just launched my new project! 🚀',
      likesCount: 42,
      commentsCount: 8,
      sharesCount: 3,
      isLiked: false,
      isBoosted: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      userId: '2',
      user: {
        id: '2',
        username: 'janedoe',
        email: 'jane@example.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
        isVerified: true,
        isCelebrity: false,
        followersCount: 5678,
        followingCount: 234,
        postsCount: 156,
        createdAt: new Date().toISOString(),
      },
      type: 'image',
      content: 'Beautiful sunset today 🌅',
      mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      likesCount: 128,
      commentsCount: 24,
      sharesCount: 12,
      isLiked: true,
      isBoosted: true,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '3',
      userId: '3',
      user: {
        id: '3',
        username: 'techguru',
        email: 'tech@example.com',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100',
        isVerified: true,
        isCelebrity: true,
        followersCount: 45678,
        followingCount: 123,
        postsCount: 892,
        createdAt: new Date().toISOString(),
      },
      type: 'link',
      content: 'Check out this amazing article!',
      linkPreview: {
        url: 'https://example.com/article',
        title: 'The Future of Social Media',
        description: 'Exploring how social platforms are evolving with new technologies and user behaviors.',
        image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400',
        domain: 'example.com',
      },
      likesCount: 256,
      commentsCount: 45,
      sharesCount: 67,
      isLiked: false,
      isBoosted: false,
      createdAt: new Date(Date.now() - 10800000).toISOString(),
      updatedAt: new Date(Date.now() - 10800000).toISOString(),
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    padding: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
