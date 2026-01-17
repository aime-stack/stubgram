
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
  Alert,
  TextInput,
  Modal,
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
import { useFollowStore } from '@/stores/followStore';
import { PostActionsSheet } from '@/components/PostActionsSheet';
import { ReportModal } from '@/components/ReportModal';

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
  const { isFollowing: checkIsFollowing, follow, unfollow, setFollowingStatus } = useFollowStore();
  const isFollowing = checkIsFollowing(post.userId);
  const [followLoading, setFollowLoading] = useState(false);

  // Check if current user is viewing their own post
  const isOwnPost = user?.id === post.userId;

  const [aspectRatio, setAspectRatio] = useState(post.aspectRatio || 1.0);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  const [pollOptions, setPollOptions] = useState(post.pollOptions);
  const [hasVoted, setHasVoted] = useState(post.pollOptions?.some(opt => opt.isVoted) || false);

  useEffect(() => {
     // Increment view count on mount
     apiClient.incrementPostView(post.id);
  }, []);

  useEffect(() => {
    // Sync global store with prop data on mount/update if not already set
    // This ensures if we load a post and valid 'isFollowing' data comes from API, we respect it
    if (post.user.isFollowing !== undefined) {
         // Only set if we haven't tracked this user yet or to sync up? 
         // Strategy: Trust the prop 'post.user' as latest truth when component mounts
         // But be careful not to overwrite valid user interactions.
         // A safe bet is to initialize if false in store but true in prop.
         if (post.user.isFollowing && !isFollowing) {
             setFollowingStatus(post.userId, true);
         }
    }
  }, [post.user.isFollowing, post.userId]);

  useEffect(() => {
    // Legacy aspect ratio code...
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

  // Video Player Setup logic...
  const isVideo = post.type === 'video' || (post.mediaUrl && (post.mediaUrl.endsWith('.mp4') || post.mediaUrl.endsWith('.mov')));
  
  const player = useVideoPlayer((isVideo && post.mediaUrl) ? post.mediaUrl : null, (player) => {
    player.loop = true;
    player.muted = true;
    // Autoplay when video loads
    player.play();
  });

  const [isMuted, setIsMuted] = useState(true);

  const toggleMute = () => {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      player.muted = newMuted;
  };

  const handleFollow = async () => {
    if (followLoading || isOwnPost) return;

    try {
      setFollowLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (isFollowing) {
        // Optimistic update
        unfollow(post.userId);
        
        await apiClient.unfollowUser(post.userId);
      } else {
        // Optimistic update
        follow(post.userId);
        addCoins(3, `Followed @${post.user.username}`);

        await apiClient.followUser(post.userId);
      }
    } catch (error) {
      console.error('Follow action failed:', error);
      // Revert on error
      if (isFollowing) {
          follow(post.userId); // Re-follow if unfollow failed
      } else {
          unfollow(post.userId); // Un-follow if follow failed
      }
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

  // Post Actions Menu State
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');

  const handleEdit = () => {
    setEditContent(post.content || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await apiClient.updatePost(post.id, { content: editContent });
      Alert.alert('Success', 'Post updated successfully');
      setShowEditModal(false);
      // Optionally refresh the post or update in place
    } catch (error) {
      console.error('Failed to update post:', error);
      Alert.alert('Error', 'Failed to update post');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deletePost(post.id);
              Alert.alert('Success', 'Post deleted successfully');
              // Trigger a refresh or remove from UI
            } catch (error) {
              console.error('Failed to delete post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const handleReport = async (reason: string, details: string) => {
    try {
      await apiClient.reportPost(post.id, reason, details);
    } catch (error) {
      console.error('Failed to report post:', error);
      throw error;
    }
  };

  const handleBoost = () => {
    // TODO: Open boost modal with payment options (coins/RWF)
    Alert.alert(
      'Boost Post',
      'Choose your boost duration and payment method',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '7 days (100 coins)', onPress: () => handleBoostPayment(7, 'coins', 100) },
        { text: '7 days (1000 RWF)', onPress: () => handleBoostPayment(7, 'rwf', 1000) },
      ]
    );
  };

  const handleBoostPayment = async (days: number, method: 'coins' | 'rwf', amount: number) => {
    try {
      await apiClient.boostPost(post.id, days, method, amount);
      Alert.alert('Success', `Post boosted for ${days} days!`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to boost post');
    }
  };

  const handleVote = async (optionIndex: number) => {
      if (hasVoted) return;
      
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Optimistic Update
        const newOptions = [...(pollOptions || [])];
        if (newOptions[optionIndex]) {
            newOptions[optionIndex].votes = (newOptions[optionIndex].votes || 0) + 1;
            newOptions[optionIndex].isVoted = true; 
        }
        setPollOptions(newOptions);
        setHasVoted(true);

        await apiClient.votePoll(post.id, optionIndex);
      } catch (error) {
        Alert.alert("Error", "Failed to submit vote");
        // Revert optimization if needed, or just let it be for MVP
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
              <Text style={themedStyles.name} numberOfLines={1}>
                  {post.user.username}
                  {post.feeling && <Text style={{ fontWeight: '400', color: themeColors.textSecondary }}> is feeling {post.feeling}</Text>}
              </Text>
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

        <TouchableOpacity 
          style={themedStyles.moreButton} 
          onPress={() => setShowActionsSheet(true)}
        >
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

            {/* Poll Rendering */}
            {pollOptions && pollOptions.length > 0 && (
                <View style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}>
                    {pollOptions.map((option, index) => {
                        // Safe calculations for percentages (assuming total votes is sum of options)
                        const totalVotes = pollOptions.reduce((sum, opt) => sum + (opt.votes || 0), 0) || 0;
                        const percentage = totalVotes > 0 ? Math.round(((option.votes || 0) / totalVotes) * 100) : 0;
                        const isVoted = hasVoted && option.isVoted; 

                        return (
                            <TouchableOpacity 
                                key={index} 
                                style={{
                                    marginBottom: 8,
                                    borderRadius: borderRadius.sm,
                                    borderWidth: 1,
                                    borderColor: isVoted ? colors.primary : themeColors.border,
                                    backgroundColor: themeColors.background,
                                    height: 44,
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}
                                disabled={hasVoted} 
                                onPress={() => handleVote(index)} 
                            >
                                {/* Progress Bar Background */}
                                {totalVotes > 0 && (
                                    <View style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: `${percentage}%`,
                                        backgroundColor: isVoted ? 'rgba(0,122,255, 0.15)' : themeColors.border, 
                                        opacity: 0.5
                                    }} />
                                )}
                                
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }}>
                                    <Text style={{ fontWeight: '600', color: themeColors.text }}>{option.text}</Text>
                                    {totalVotes > 0 && (
                                        <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>{percentage}%</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                     <Text style={{ fontSize: 12, color: themeColors.textSecondary, marginTop: 4 }}>
                        {pollOptions.reduce((sum, opt) => sum + (opt.votes || 0), 0)} votes
                    </Text>
                </View>
            )}

            {/* Grid Layout Render Logic - Skip if it's a single video (handled by legacy logic) */}
            {post.mediaUrls && post.mediaUrls.length > 0 && !(post.mediaUrls.length === 1 && (post.type === 'video' || post.mediaUrls[0].type === 'video')) ? (
                <View style={{ marginHorizontal: spacing.md, borderRadius: borderRadius.md, overflow: 'hidden' }}>
                    
                    {/* 1 Image: Full Width (fallback for single item in array) */}
                    {post.mediaUrls.length === 1 && (
                        <TouchableOpacity 
                            activeOpacity={0.9}
                            onPress={() => router.push(`/post/${post.id}?mediaIndex=0`)}
                            style={{ height: 400 * (post.mediaUrls[0].aspectRatio || 1) }}
                        >
                            <Image 
                                source={{ uri: post.mediaUrls[0].url }} 
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover" 
                            />
                        </TouchableOpacity>
                    )}

                    {/* 2 Images: Side by Side */}
                    {post.mediaUrls.length === 2 && (
                        <View style={{ flexDirection: 'row', height: 300, gap: 2 }}>
                            {post.mediaUrls.map((item, index) => (
                                <TouchableOpacity 
                                    key={index}
                                    activeOpacity={0.9}
                                    onPress={() => router.push(`/post/${post.id}?mediaIndex=${index}`)}
                                    style={{ flex: 1 }}
                                >
                                    <Image 
                                        source={{ uri: item.url }} 
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover" 
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* 3 Images: One big on left, two stacked on right */}
                    {post.mediaUrls.length === 3 && (
                        <View style={{ flexDirection: 'row', height: 300, gap: 2 }}>
                            <TouchableOpacity 
                                activeOpacity={0.9} 
                                onPress={() => router.push(`/post/${post.id}?mediaIndex=0`)}
                                style={{ flex: 1 }}
                            >
                                <Image source={{ uri: post.mediaUrls[0].url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            </TouchableOpacity>
                            <View style={{ flex: 1, gap: 2 }}>
                                {post.mediaUrls.slice(1).map((item, index) => (
                                    <TouchableOpacity 
                                        key={index}
                                        activeOpacity={0.9}
                                        onPress={() => router.push(`/post/${post.id}?mediaIndex=${index + 1}`)}
                                        style={{ flex: 1 }}
                                    >
                                        <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* 4 Images: 2x2 Grid */}
                    {post.mediaUrls.length === 4 && (
                        <View style={{ height: 300, gap: 2 }}>
                            <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
                                {post.mediaUrls.slice(0, 2).map((item, index) => (
                                    <TouchableOpacity 
                                        key={index}
                                        activeOpacity={0.9}
                                        onPress={() => router.push(`/post/${post.id}?mediaIndex=${index}`)}
                                        style={{ flex: 1 }}
                                    >
                                        <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
                                {post.mediaUrls.slice(2, 4).map((item, index) => (
                                    <TouchableOpacity 
                                        key={index + 2}
                                        activeOpacity={0.9}
                                        onPress={() => router.push(`/post/${post.id}?mediaIndex=${index + 2}`)}
                                        style={{ flex: 1 }}
                                    >
                                        <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Fallback for > 4 or other cases (e.g. 1) handled mainly by Single Logic below or simple slice */}
                    {post.mediaUrls.length > 4 && (
                        <View style={{ height: 300, gap: 2 }}>
                            <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
                                {post.mediaUrls.slice(0, 2).map((item, index) => (
                                    <TouchableOpacity key={index} style={{ flex: 1 }} onPress={() => router.push(`/post/${post.id}?mediaIndex=${index}`)}>
                                        <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
                                <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/post/${post.id}?mediaIndex=2`)}>
                                    <Image source={{ uri: post.mediaUrls[2].url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                </TouchableOpacity>
                                <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/post/${post.id}?mediaIndex=3`)}>
                                    <View style={{ width: '100%', height: '100%' }}>
                                        <Image source={{ uri: post.mediaUrls[3].url }} style={{ width: '100%', height: '100%', opacity: 0.6 }} resizeMode="cover" />
                                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                                            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>+{post.mediaUrls.length - 4}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>
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
                  {/* Play/Pause Area */}
                  <TouchableOpacity 
                    style={StyleSheet.absoluteFill} 
                    onPress={() => {
                        if (player.playing) {
                            player.pause();
                        } else {
                            player.play();
                        }
                    }}
                  />
                  {/* Mute Toggle Button */}
                  <TouchableOpacity 
                    style={{
                        position: 'absolute',
                        bottom: 12,
                        right: 12,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        padding: 6,
                        borderRadius: 20,
                    }}
                    onPress={toggleMute}
                  >
                    <IconSymbol 
                        ios_icon_name={isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill"} 
                        android_material_icon_name={isMuted ? "volume-off" : "volume-up"} 
                        size={16} 
                        color="#FFF" 
                    />
                  </TouchableOpacity>
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

          <View style={themedStyles.actionItem}>
             <IconSymbol ios_icon_name="eye" android_material_icon_name="visibility" size={20} color={themeColors.textSecondary} />
             <Text style={[themedStyles.actionCount, { color: themeColors.textSecondary }]}>{(post.viewsCount || 0).toLocaleString()}</Text>
          </View>
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

      {/* Likes Count Footer (Restored) */}
      {post.likesCount > 0 && (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
           <Text style={[typography.caption, { color: themeColors.textSecondary }]}>
               {post.likesCount.toLocaleString()} likes
           </Text>
        </View>
      )}

      {/* Post Actions Sheet */}
      <PostActionsSheet
        visible={showActionsSheet}
        onClose={() => setShowActionsSheet(false)}
        isOwnPost={isOwnPost}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReport={() => setShowReportModal(true)}
        onBoost={handleBoost}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReport}
      />

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.md }}>
          <View style={[{ backgroundColor: themeColors.card, borderRadius: borderRadius.xl, padding: spacing.md }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={[typography.h2, { color: themeColors.text, fontSize: 20, fontWeight: '700' }]}>Edit Post</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                typography.body,
                {
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                  borderColor: themeColors.border,
                  borderWidth: 1,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  minHeight: 150,
                  textAlignVertical: 'top',
                },
              ]}
              placeholder="What's on your mind?"
              placeholderTextColor={themeColors.textSecondary}
              multiline
              value={editContent}
              onChangeText={setEditContent}
            />
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: spacing.md,
                borderRadius: borderRadius.md,
                alignItems: 'center',
                marginTop: spacing.md,
              }}
              onPress={handleSaveEdit}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
