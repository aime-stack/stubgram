
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';
import { PostCard } from '@/components/PostCard';
import { AdCard } from '@/components/AdCard';
import { StoriesBar } from '@/components/StoriesBar';
import { HomeComposer } from '@/components/HomeComposer';
import { IconSymbol } from '@/components/IconSymbol';
import { Post } from '@/types';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

// Ad type for feed items
interface FeedAd {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  tier?: string;
  isAd: true;
}

type FeedItem = Post | FeedAd;

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { isDark } = useThemeStore();
  const themeColors = isDark ? darkColors : lightColors;
  const [posts, setPosts] = useState<Post[]>([]);
  const [ads, setAds] = useState<FeedAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = useCallback(async (currentCursor: string | null = null, refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Fetch personalized feed from Supabase
      const response = await apiClient.getFeed(currentCursor || undefined, 10);
      const newPosts = response.data || [];

      if (refresh || !currentCursor) {
        setPosts(newPosts);
      } else {
        setPosts((prevPosts) => [...prevPosts, ...newPosts]);
      }

      setHasMore(response.hasMore ?? false);
      setCursor(response.nextCursor || null);
    } catch (error) {
      console.error('Failed to load feed:', error);
      // Show mock data for development
      if (!currentCursor) {
        setPosts(getMockPosts());
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);



  const loadAds = useCallback(async () => {
    try {
      const response = await apiClient.getActiveAds(3);
      setAds(response.data as FeedAd[]);
    } catch (error) {
      console.error('Failed to load ads:', error);
      setAds([]);
    }
  }, []);

  useEffect(() => {
    // Only load data when authenticated and not loading
    if (!authLoading && isAuthenticated) {
      loadFeed();
      loadFeed();
      loadAds();
    }
  }, [isAuthenticated, authLoading, loadFeed, loadAds]);

  const handleRefresh = useCallback(() => {
    loadFeed(null, true);
    loadAds();
  }, [loadFeed, loadAds]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore && cursor) {
      loadFeed(cursor);
    }
  }, [isLoading, hasMore, cursor, loadFeed]);

  const handleCreatePost = useCallback(() => {
    router.push('/create-post');
  }, [router]);

  const handleCreateStory = useCallback(() => {
    router.push('/create-story');
  }, [router]);

  // Mix ads into the feed - insert an ad every 5 posts
  const getFeedWithAds = useCallback((): FeedItem[] => {
    if (ads.length === 0) return posts;

    const mixed: FeedItem[] = [];
    let adIndex = 0;

    posts.forEach((post, index) => {
      mixed.push(post);
      // Insert an ad every 5 posts
      if ((index + 1) % 5 === 0 && adIndex < ads.length) {
        mixed.push(ads[adIndex]);
        adIndex++;
      }
    });

    return mixed;
  }, [posts, ads]);

  const renderFeedItem = useCallback(({ item }: { item: FeedItem }) => {
    // Check if item is an ad
    if ('isAd' in item && item.isAd) {
      return <AdCard ad={item} />;
    }
    // Otherwise render as post
    return <PostCard post={item as Post} />;
  }, []);

  const renderHeader = useCallback(() => (
    <View>
      <StoriesBar onCreateStory={handleCreateStory} />
      <HomeComposer />
    </View>
  ), [handleCreateStory]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <IconSymbol
        ios_icon_name="photo.on.rectangle.angled"
        android_material_icon_name="photo-library"
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
    if (!isLoading || !cursor) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={themeColors.primary} />
      </View>
    );
  }, [isLoading, cursor, themeColors.primary]);

  if (authLoading || (isLoading && !cursor)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: themeColors.background, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.avatarButton}
        >
          <Image
            source={{ uri: user?.avatar || 'https://via.placeholder.com/40' }}
            style={[styles.headerAvatar, { backgroundColor: themeColors.border }]}
          />
        </TouchableOpacity>

        <View style={styles.brandingContainer}>
          <Text style={[styles.brandingText, { color: themeColors.text }]}>Stubgram</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/camera')} style={styles.iconButton}>
            <IconSymbol
              ios_icon_name="camera"
              android_material_icon_name="photo-camera"
              size={24}
              color={themeColors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => console.log('Notifications')} style={[styles.iconButton, { marginLeft: spacing.xs }]}>
            <IconSymbol
              ios_icon_name="bell"
              android_material_icon_name="notifications-none"
              size={24}
              color={themeColors.text}
            />
            {/* Notification badge if needed */}
            <View style={styles.badge} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={getFeedWithAds()}
        renderItem={renderFeedItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: themeColors.primary }]}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    zIndex: 10,
  },
  avatarButton: {
    padding: 4,
    width: 44,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.border,
  },
  brandingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandingText: {
    ...typography.branding,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 44,
  },
  iconButton: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  listContainer: {
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
    bottom: 110,
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
