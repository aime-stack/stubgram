
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
import { spacing, borderRadius, typography, colors } from '@/styles/commonStyles';
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
const renderContentWithHashtags = (content: string, router: any) => {
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
    return <Text key={index}>{part}</Text>;
  });
};

export function PostCard({ post, onLike, onComment, onShare }: PostCardProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addCoins } = useWalletStore();
  const { isDark } = useThemeStore();
  const themeColors = isDark ? darkColors : lightColors;

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
        url: `https://snapgram.app/post/${post.id}`,
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
    <TouchableOpacity
      style={[styles.container, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}
      onPress={() => router.push(`/post/${post.id}`)}
      activeOpacity={0.7}
    >
      {/* Avatar Column */}
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); router.push(`/user/${post.userId}`); }}>
        <Image
          source={{ uri: post.user.avatar || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
      </TouchableOpacity>

      {/* Content Column */}
      <View style={styles.contentContainer}>
        {/* Header: Name + Handle + Time + Follow */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={styles.name} numberOfLines={1}>{post.user.username}</Text>
            {post.user.isVerified && <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={14} color={colors.primary} style={styles.verificationBadge} />}
            <Text style={styles.handle} numberOfLines={1}>@{post.user.username?.toLowerCase()}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.time}>{formatTime(post.createdAt)}</Text>
          </View>

          {/* Follow Button */}
          {!isOwnPost && (
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
                followLoading && styles.followButtonDisabled,
              ]}
              onPress={(e) => { e.stopPropagation(); handleFollow(); }}
              disabled={followLoading}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.moreButton}>
            <IconSymbol ios_icon_name="ellipsis" android_material_icon_name="more-horiz" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Text Content with Hashtags */}
        {post.content && (
          <Text style={styles.textContent}>
            {renderContentWithHashtags(post.content, router)}
          </Text>
        )}

        {/* Media */}
        {post.mediaUrl && (post.type === 'image' || post.type === 'video') && (
          <Image source={{ uri: post.mediaUrl }} style={styles.media} resizeMode="cover" />
        )}

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          {/* Reply */}
          <TouchableOpacity style={styles.actionItem} onPress={(e) => { e.stopPropagation(); handleComment(); }}>
            <IconSymbol ios_icon_name="bubble.left" android_material_icon_name="chat-bubble-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.actionCount}>{post.commentsCount > 0 ? post.commentsCount : ''}</Text>
          </TouchableOpacity>

          {/* Repost */}
          <TouchableOpacity style={styles.actionItem} onPress={(e) => { e.stopPropagation(); handleRepost(); }}>
            <IconSymbol
              ios_icon_name="arrow.2.squarepath"
              android_material_icon_name="cached"
              size={18}
              color={isReposted ? "#00BA7C" : colors.textSecondary}
            />
            <Text style={[styles.actionCount, isReposted && { color: "#00BA7C" }]}>{repostCount > 0 ? repostCount : ''}</Text>
          </TouchableOpacity>

          {/* Like */}
          <TouchableOpacity style={styles.actionItem} onPress={(e) => { e.stopPropagation(); handleLike(); }}>
            <IconSymbol
              ios_icon_name={isLiked ? "heart.fill" : "heart"}
              android_material_icon_name={isLiked ? "favorite" : "favorite-border"}
              size={18}
              color={isLiked ? "#F91880" : colors.textSecondary}
            />
            <Text style={[styles.actionCount, isLiked && { color: "#F91880" }]}>{likesCount > 0 ? likesCount : ''}</Text>
          </TouchableOpacity>

          {/* Save */}
          <TouchableOpacity style={styles.actionItem} onPress={(e) => { e.stopPropagation(); handleSave(); }}>
            <IconSymbol
              ios_icon_name={isSaved ? "bookmark.fill" : "bookmark"}
              android_material_icon_name={isSaved ? "bookmark" : "bookmark-border"}
              size={18}
              color={isSaved ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.actionItem} onPress={(e) => { e.stopPropagation(); handleShare(); }}>
            <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="ios-share" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
    backgroundColor: colors.border,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
    marginRight: 4,
  },
  verificationBadge: {
    marginRight: 4,
  },
  handle: {
    color: colors.textSecondary,
    fontSize: 15,
    flexShrink: 1,
  },
  dot: {
    color: colors.textSecondary,
    marginHorizontal: 4,
  },
  time: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  followButton: {
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  followButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  followingButtonText: {
    color: colors.text,
  },
  moreButton: {
    marginLeft: spacing.sm,
    padding: 4,
  },
  textContent: {
    ...typography.body,
    color: colors.text,
    fontSize: 15,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  hashtag: {
    color: colors.primary,
    fontWeight: '600',
  },
  media: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: colors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingRight: spacing.lg,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 40,
  },
  actionCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
