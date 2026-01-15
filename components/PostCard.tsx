
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
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

const PostCardComponent = ({ post, onLike, onComment, onShare }: PostCardProps) => {
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

  const [aspectRatio, setAspectRatio] = useState(post.aspectRatio || 1.0);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  useEffect(() => {
    // If we have a valid aspect ratio from DB (and it's not just the default 1.0 for legacy posts which might actually be different), use it.
    // However, since we defaulted to 1.0 in migration, we might want to still check Image.getSize for older posts if we suspect it's wrong.
    // But for V2, create-post sends exact ratio.
    if (post.aspectRatio && post.aspectRatio !== 1.0) {
        setAspectRatio(post.aspectRatio);
        return;
    }

    if (post.mediaUrl && (post.type === 'image' || post.type === 'post')) {
      Image.getSize(post.mediaUrl, (w, h) => {
        if (w > 0 && h > 0) {
          setAspectRatio(w / h);
        }
      }, (error) => {
          // console.log('Error getting image size:', error);
      });
    } else if (post.type === 'video' || post.type === 'reel') {
        // Default video aspect ratio (can be improved if video metadata is available)
        setAspectRatio(9/16); 
    }
  }, [post.mediaUrl, post.type, post.aspectRatio]);

  // Video Player Setup
  const isVideo = post.type === 'video' || (post.mediaUrl && (post.mediaUrl.endsWith('.mp4') || post.mediaUrl.endsWith('.mov')));
  
  const player = useVideoPlayer((isVideo && post.mediaUrl) ? post.mediaUrl : null, (player) => {
    player.loop = true;
    player.muted = true;
  });

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

  const handleLinkPress = async () => {
    if (post.linkPreview?.url) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await WebBrowser.openBrowserAsync(post.linkPreview.url);
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

            {/* Carousel Render Logic */}
            {post.mediaUrls && post.mediaUrls.length > 0 ? (
                <View>
                    <FlatList
                        data={post.mediaUrls}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        bounces={false}
                        keyExtractor={(_, index) => index.toString()}
                        onMomentumScrollEnd={(e) => {
                            const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                            setCurrentCarouselIndex(newIndex);
                        }}
                        renderItem={({ item }) => {
                            if (item.type === 'video') {
                                // Simple video render for carousel - optimized for muted feed view
                                // Note: In a real app we'd need more complex visibility logic to play only the visible one
                                return (
                                    <View style={{ width: width, aspectRatio: item.aspectRatio || (9/16), backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                                        <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={50} color="#FFF" />
                                        {/* Placeholder for video - for now just an icon due to complexity of multi-video lists */}
                                    </View>
                                )
                            } 
                            return (
                                <View style={{ width: width, alignItems: 'center' }}>
                                     <Image 
                                        source={{ uri: item.url }} 
                                        style={[themedStyles.media, { width: width - (spacing.md * 2), aspectRatio: item.aspectRatio || 1.0 }]} 
                                        resizeMode="cover" 
                                     />
                                </View>
                            )
                        }}
                    />
                    {/* Pagination Dots */}
                    {post.mediaUrls.length > 1 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                            {post.mediaUrls.map((_, index) => (
                                <View 
                                    key={index}
                                    style={{
                                        width: 6, 
                                        height: 6, 
                                        borderRadius: 3, 
                                        backgroundColor: index === currentCarouselIndex ? colors.primary : themeColors.border,
                                        marginHorizontal: 3
                                    }} 
                                />
                            ))}
                        </View>
                    )}
                </View>
            ) : (
             /* Single Media Render Logic (Legacy) */
             post.mediaUrl && (
              isVideo ? (
                <View style={[themedStyles.media, { aspectRatio, backgroundColor: '#000' }]}>
                  <VideoView
                    player={player}
                    style={{ flex: 1 }}
                    contentFit="cover"
                    nativeControls={false}
                    allowsFullscreen
                    allowsPictureInPicture
                  />
                  {/* Play/Pause overlay could go here, but for feed we often strictly use controls or auto-play. 
                      For now, simple implementation since iOS/Android behavior varies. 
                      Adding a simple play control could be nice if auto-play isn't perfect. */}
                  <TouchableOpacity 
                    style={StyleSheet.absoluteFill} 
                    onPress={() => {
                        if (player.playing) {
                            player.pause();
                        } else {
                            player.play();
                            player.muted = false; // Unmute on explicit play
                        }
                    }}
                  />
                  {!player.playing && (
                      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }]}>
                          <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 30, padding: 10 }}>
                              <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={30} color="#FFF" />
                          </View>
                      </View>
                  )}
                </View>
              ) : (
                (post.type === 'image' || post.type === 'post') && (
                  <Image source={{ uri: post.mediaUrl }} style={[themedStyles.media, { aspectRatio }]} resizeMode="cover" />
                )
              )
            )
            )}

            {post.linkPreview && (
                <TouchableOpacity onPress={handleLinkPress} activeOpacity={0.9} style={themedStyles.linkPreviewContainer}>
                    {post.linkPreview.image && (
                        <Image source={{ uri: post.linkPreview.image }} style={themedStyles.linkImage} />
                    )}
                    <View style={themedStyles.linkInfo}>
                        <Text style={themedStyles.linkTitle} numberOfLines={1}>{post.linkPreview.title}</Text>
                        <Text style={themedStyles.linkDescription} numberOfLines={2}>{post.linkPreview.description}</Text>
                        <Text style={themedStyles.linkDomain}>{post.linkPreview.domain}</Text>
                    </View>
                </TouchableOpacity>
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

export const PostCard = React.memo(PostCardComponent);

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
    width: undefined, // Let it fill the container minus margins
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: themeColors.border,
    overflow: 'hidden',
    // aspectRatio is now handled dynamically in the component
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

  linkPreviewContainer: {
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    overflow: 'hidden',
    marginTop: spacing.sm,
    backgroundColor: themeColors.background,
  },
  linkImage: {
    width: '100%',
    height: 150,
    backgroundColor: themeColors.border,
  },
  linkInfo: {
    padding: spacing.sm,
  },
  linkTitle: {
    fontWeight: '700',
    color: themeColors.text,
    fontSize: 14,
    marginBottom: 4,
  },
  linkDescription: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  linkDomain: {
    color: colors.primary,
    fontSize: 12,
    textTransform: 'lowercase',
  },
});

// Legacy styles constant for renderContentWithHashtags (it's outside the component)
const styles = StyleSheet.create({
  hashtag: {
    color: colors.primary,
    fontWeight: '600',
  },
});
