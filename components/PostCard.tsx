
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Post } from '@/types';
import { spacing, borderRadius, typography, colors, useThemedStyles } from '@/styles/commonStyles';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import { useWalletStore } from '@/stores/walletStore';
import { useAuthStore } from '@/stores/authStore';

const { width } = Dimensions.get('window');

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

// Helper to render content with clickable hashtags
const renderContentWithHashtags = (content: string, router: any, themeColors: any) => {
  const parts = content.split(/(#\w+)/g);

  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      return (
        <Text
          key={index}
          style={styles.hashtag}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Navigate to hashtag search
            router.push(`/search?q=${encodeURIComponent(part)}`);
          }}
        >
          {part}
        </Text>
      );
    }
    return <Text key={index} style={{ color: themeColors.text }}>{part}</Text>;
  });
};

export function PostCard({ post, onLike, onComment, onShare }: PostCardProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addCoins } = useWalletStore();
  const { isDark } = useThemeStore();
  const themeColors = isDark ? darkColors : lightColors;
  const themedStyles = useThemedStyles(createStyles);

  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Check if current user is viewing their own post
  const isOwnPost = user?.id === post.userId;

  // Check follow status on mount
  useEffect(() => {
    if (!isOwnPost && post.userId) {
      apiClient.isFollowing(post.userId).then(setIsFollowing).catch(() => { });
    }
  }, [post.userId, isOwnPost]);

  const handleFollow = async () => {
    if (followLoading || isOwnPost) return;

    try {
      setFollowLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (isFollowing) {
        await apiClient.unfollowUser(post.userId);
        setIsFollowing(false);
      } else {
        await apiClient.followUser(post.userId);
        setIsFollowing(true);
        addCoins(3, `Followed @${post.user.username}`);
      }
    } catch (error) {
      console.error('Follow action failed:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newIsLiked = !isLiked;
      setIsLiked(newIsLiked);
      setLikesCount(newIsLiked ? likesCount + 1 : likesCount - 1);
      await apiClient.likePost(post.id);
      if (newIsLiked) addCoins(1, 'Liked a post');
      onLike?.();
    } catch (error) {
      console.error('Failed to like post:', error);
      setIsLiked(!isLiked); // Revert
    }
  };

  const handleComment = () => {
    router.push(`/post/${post.id}`);
    onComment?.();
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `Check out this post by @${post.user.username}: ${post.content}`,
        url: `https://Stubgram.app/post/${post.id}`,
      });
      // Award coins for sharing
      addCoins(2, 'Shared a post');
    } catch (error) {
      console.error(error);
    }
  };

  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.sharesCount || 0);

  const handleRepost = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsReposted(!isReposted);
      setRepostCount(isReposted ? repostCount - 1 : repostCount + 1);

      // Call API to repost internally
      await apiClient.sharePost(post.id, 'internal');

      if (!isReposted) {
        addCoins(2, 'Reposted content');
      }
    } catch (error) {
      console.error('Failed to repost:', error);
      setIsReposted(isReposted);
      setRepostCount(repostCount);
    }
  };

  const [isSaved, setIsSaved] = useState(post.isSaved || false);

  const handleSave = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const wasIsSaved = isSaved;
      setIsSaved(!isSaved);

      // savePost API already toggles save/unsave
      const result = await apiClient.savePost(post.id);
      setIsSaved(result.saved);
    } catch (error) {
      console.error('Failed to save post:', error);
      setIsSaved(!isSaved); // Revert on error
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diff = now.getTime() - postDate.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  return (
    <View
      style={[themedStyles.container]}
    >
      {/* Header: User Info + Follow Button */}
      <View style={themedStyles.header}>
        <TouchableOpacity
          onPress={() => router.push(`/user/${post.userId}`)}
          style={themedStyles.userInfo}
        >
          <Image
            source={{ uri: post.user.avatar || 'https://via.placeholder.com/40' }}
            style={themedStyles.avatar}
          />
          <View>
            <View style={themedStyles.nameRow}>
              <Text style={themedStyles.name} numberOfLines={1}>{post.user.username}</Text>
              {post.user.isVerified && (
                <IconSymbol
                  ios_icon_name="checkmark.seal.fill"
                  android_material_icon_name="verified"
                  size={14}
                  color={colors.primary}
                  style={themedStyles.verificationBadge}
                />
              )}
            </View>
            <Text style={themedStyles.time}>{formatTime(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>

        {/* Follow Button */}
        {!isOwnPost && (
          <TouchableOpacity
            style={[
              themedStyles.followButton,
              isFollowing && themedStyles.followingButton,
              followLoading && themedStyles.followButtonDisabled,
            ]}
            onPress={handleFollow}
            disabled={followLoading}
          >
            <Text style={[themedStyles.followButtonText, isFollowing && themedStyles.followingButtonText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={themedStyles.moreButton}>
          <IconSymbol ios_icon_name="ellipsis" android_material_icon_name="more-horiz" size={20} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`/post/${post.id}`)}
      >
        {post.type === 'reshare' ? (
          <View style={themedStyles.reshareContainer}>
            <View style={themedStyles.reshareIndicator}>
              <IconSymbol ios_icon_name="arrow.2.squarepath" android_material_icon_name="cached" size={14} color={themeColors.textSecondary} />
              <Text style={themedStyles.reshareText}>{post.user.username} reshared</Text>
            </View>
            
            <View style={themedStyles.nestedPost}>
              <View style={themedStyles.nestedHeader}>
                <Image
                  source={{ uri: post.originalPost?.user?.avatar || 'https://via.placeholder.com/20' }}
                  style={themedStyles.nestedAvatar}
                />
                <Text style={themedStyles.nestedUsername}>{post.originalPost?.user?.username || 'user'}</Text>
              </View>
              {post.originalPost?.content && (
                <Text style={themedStyles.nestedContent} numberOfLines={3}>
                  {post.originalPost.content}
                </Text>
              )}
              {post.originalPost?.mediaUrl && (
                <Image 
                  source={{ uri: post.originalPost.mediaUrl }} 
                  style={themedStyles.nestedMedia} 
                  resizeMode="cover" 
                />
              )}
            </View>
          </View>
        ) : (
          <>
            {post.content && (
              <Text style={themedStyles.textContent}>
                {renderContentWithHashtags(post.content, router, themeColors)}
              </Text>
            )}

            {post.mediaUrl && (post.type === 'image' || post.type === 'video' || post.type === 'reel' || post.type === 'post') && (
              <Image source={{ uri: post.mediaUrl }} style={themedStyles.media} resizeMode="cover" />
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Engagement Row */}
      <View style={themedStyles.actionsRow}>
        <View style={themedStyles.leftActions}>
          <TouchableOpacity style={themedStyles.actionItem} onPress={handleLike}>
            <IconSymbol
              ios_icon_name={isLiked ? "heart.fill" : "heart"}
              android_material_icon_name={isLiked ? "favorite" : "favorite-border"}
              size={24}
              color={isLiked ? "#FF3B30" : themeColors.text}
            />
            {likesCount > 0 && <Text style={[themedStyles.actionCount, isLiked && { color: "#FF3B30" }]}>{likesCount}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={themedStyles.actionItem} onPress={handleComment}>
            <IconSymbol ios_icon_name="bubble.left" android_material_icon_name="chat-bubble-outline" size={22} color={themeColors.text} />
            {post.commentsCount > 0 && <Text style={themedStyles.actionCount}>{post.commentsCount}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={themedStyles.actionItem} onPress={handleRepost}>
            <IconSymbol
              ios_icon_name="arrow.2.squarepath"
              android_material_icon_name="cached"
              size={22}
              color={isReposted ? "#00BA7C" : themeColors.text}
            />
            {repostCount > 0 && <Text style={[themedStyles.actionCount, isReposted && { color: "#00BA7C" }]}>{repostCount}</Text>}
          </TouchableOpacity>
        </View>

        <View style={themedStyles.rightActions}>
          <TouchableOpacity style={themedStyles.actionItem} onPress={handleSave}>
            <IconSymbol
              ios_icon_name={isSaved ? "bookmark.fill" : "bookmark"}
              android_material_icon_name={isSaved ? "bookmark" : "bookmark-border"}
              size={22}
              color={isSaved ? colors.primary : themeColors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity style={themedStyles.actionItem} onPress={handleShare}>
            <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={22} color={themeColors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const createStyles = (themeColors: typeof darkColors) => StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: spacing.sm,
    backgroundColor: themeColors.border,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontWeight: '700',
    color: themeColors.text,
    fontSize: 14,
    marginRight: 4,
  },
  verificationBadge: {
    marginRight: 4,
  },
  time: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  followingButtonText: {
    color: themeColors.text,
  },
  moreButton: {
    padding: 4,
  },
  textContent: {
    ...typography.body,
    color: themeColors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  hashtag: {
    color: colors.primary,
    fontWeight: '600',
  },
  media: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: themeColors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text,
  },
  reshareIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
  reshareText: {
    fontSize: 13,
    color: themeColors.textSecondary,
    fontWeight: '700',
  },
  reshareContainer: {
    paddingBottom: spacing.sm,
  },
  nestedPost: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: borderRadius.md,
    backgroundColor: themeColors.background,
    marginLeft: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  nestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  nestedAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: themeColors.border,
  },
  nestedUsername: {
    fontWeight: '700',
    color: themeColors.text,
    fontSize: 12,
  },
  nestedContent: {
    fontSize: 14,
    color: themeColors.text,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  nestedMedia: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.sm,
    backgroundColor: themeColors.border,
  },
});

// Legacy styles constant for renderContentWithHashtags (it's outside the component)
const styles = StyleSheet.create({
  hashtag: {
    color: colors.primary,
    fontWeight: '600',
  },
});
