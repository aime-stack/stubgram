
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useVideoPlayer, VideoView } from 'expo-video';
import { PostCard } from '@/components/PostCard';
import { Post, Comment } from '@/types';
import { apiClient } from '@/services/api';
import { useWalletStore } from '@/stores/walletStore';
import * as Haptics from 'expo-haptics';
import { isSpecialPremiumUser } from '@/utils/premium';

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addCoins } = useWalletStore();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const loadPost = useCallback(async () => {
    try {
      // TODO: Backend Integration - Fetch post details
      const response = await apiClient.getPost(id);
      setPost(response.data);
    } catch (error) {
      console.error('Failed to load post:', error);
      Alert.alert('Error', 'Failed to load post');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadComments = useCallback(async () => {
    try {
      // TODO: Backend Integration - Fetch comments
      const response = await apiClient.getComments(id);
      setComments(response.data || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  }, [id]);

  // Video Player Setup
  const isVideo = post?.type === 'video' || (post?.mediaUrl && (post.mediaUrl.endsWith('.mp4') || post.mediaUrl.endsWith('.mov')));
  
  const player = useVideoPlayer((isVideo && post?.mediaUrl) ? post.mediaUrl : null, (player) => {
    player.loop = true;
    player.muted = false; // Details view should have sound by default or be toggleable
    player.play();
  });

  useEffect(() => {
    loadPost();
    loadComments();
  }, [id, loadPost, loadComments]);

  const [replyToId, setReplyToId] = useState<string | null>(null);

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      // TODO: Backend Integration - Submit comment
      // Note: apiClient.commentOnPost currently doesn't support parentId arg in this version, 
      // but assuming the backend/API is updated or we just post top-level for now with @mention if needed.
      // Ideally we'd update API to accept parentId.
      // For now, if replying, we'll prefix with @username

      let text = commentText.trim();
      if (replyToId) {
        const parent = comments.find(c => c.id === replyToId);
        if (parent) {
          // text = `@${parent.user.username} ${text}`; // Optional: prefix
        }
      }

      await apiClient.commentOnPost(id, text);

      // Reward user
      addCoins(5, 'Commented on a post');
      
      // Update local comment count
      setPost(prev => prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null);

      setCommentText('');
      setReplyToId(null);
      loadComments();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to submit comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  }, [commentText, id, addCoins, loadComments, replyToId, comments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
      </View>
    );
  }

  const isVerifiedUser = post.user.isVerified || isSpecialPremiumUser(post.user.username);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} 
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Main Post Content (Twitter Style) */}
        <View style={styles.mainPost}>
          <View style={styles.postHeader}>
            <TouchableOpacity onPress={() => router.push(`/user/${post.userId}`)}>
              <Image
                source={{ uri: post.user.avatar || 'https://via.placeholder.com/50' }}
                style={styles.mainAvatar}
              />
            </TouchableOpacity>
            <View style={styles.mainUserInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.mainName}>{post.user.username}</Text>
                {isVerifiedUser && (
                  <IconSymbol
                    ios_icon_name="checkmark.seal.fill"
                    android_material_icon_name="verified"
                    size={16}
                    color={colors.primary}
                  />
                )}
              </View>
              <Text style={styles.mainHandle}>@{post.user.username?.toLowerCase()}</Text>
            </View>
            <TouchableOpacity>
              <IconSymbol ios_icon_name="ellipsis" android_material_icon_name="more-horiz" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.mainContentText}>{post.content}</Text>


          {post.mediaUrl && (
            isVideo ? (
                <View style={[styles.mainMedia, { backgroundColor: '#000', aspectRatio: post.aspectRatio || (9/16) }]}>
                  <VideoView
                    player={player}
                    style={{ flex: 1, borderRadius: borderRadius.lg }}
                    contentFit="cover"
                    nativeControls={true}
                  />
                </View>
            ) : (
                <Image source={{ uri: post.mediaUrl }} style={[styles.mainMedia, { aspectRatio: post.aspectRatio || 1 }]} resizeMode="cover" />
            )
          )}

          <View style={styles.timeRow}>
            <Text style={styles.detailedTime}>
              {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statLine}>
              <Text style={styles.statValue}>{post.sharesCount || 0}</Text>
              <Text style={styles.statLabel}>Reposts</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={styles.statValue}>{post.likesCount || 0}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={styles.statValue}>{post.commentsCount || 0}</Text>
              <Text style={styles.statLabel}>Quotes</Text>
            </View>
          </View>

          <View style={styles.mainActions}>
            <TouchableOpacity>
              <IconSymbol ios_icon_name="bubble.left" android_material_icon_name="chat-bubble-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={async () => {
              try {
                await apiClient.sharePost(id, 'internal');
                addCoins(2, 'Reposted content');
                setPost(prev => prev ? { ...prev, sharesCount: (prev.sharesCount || 0) + 1 } : null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              } catch (error) {
                console.error('Failed to repost:', error);
                Alert.alert('Error', 'Failed to repost');
              }
            }}>
              <IconSymbol ios_icon_name="arrow.2.squarepath" android_material_icon_name="cached" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={async () => {
              try {
                const response = await apiClient.likePost(id);
                const { isLiked: newIsLiked, likesCount: newLikesCount } = response.data;
                
                setIsLiked(newIsLiked);
                setPost(prev => prev ? { ...prev, likesCount: prev.likesCount + (newIsLiked ? 1 : -1) } : null);
                
                if (newIsLiked) {
                    addCoins(1, 'Liked a post');
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (error) {
                console.error('Failed to like post:', error);
                Alert.alert('Error', 'Action failed');
              }
            }}>
              <IconSymbol ios_icon_name={isLiked ? 'heart.fill' : 'heart'} android_material_icon_name={isLiked ? 'favorite' : 'favorite-border'} size={24} color={isLiked ? colors.secondary : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setIsBookmarked(!isBookmarked);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}>
              <IconSymbol ios_icon_name={isBookmarked ? 'bookmark.fill' : 'bookmark'} android_material_icon_name={isBookmarked ? 'bookmark' : 'bookmark-border'} size={24} color={isBookmarked ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={async () => {
              try {
                await apiClient.sharePost(id);
                addCoins(2, 'Shared a post');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert('Success', 'Post shared!');
              } catch (error) {
                console.error('Failed to share:', error);
              }
            }}>
              <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Comments ({comments.length})
          </Text>

          {comments.length === 0 ? (
            <View style={styles.emptyComments}>
              <IconSymbol
                ios_icon_name="bubble.left"
                android_material_icon_name="chat-bubble-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment!</Text>
            </View>
          ) : (
            comments.map((comment, index) => (
              <View key={index} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUsername}>
                    {comment.user.username}
                  </Text>
                  <Text style={styles.commentTime}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
                <View style={styles.commentActions}>
                  <TouchableOpacity style={styles.commentAction}>
                    <IconSymbol
                      ios_icon_name={comment.isLiked ? 'heart.fill' : 'heart'}
                      android_material_icon_name={comment.isLiked ? 'favorite' : 'favorite-border'}
                      size={16}
                      color={comment.isLiked ? colors.secondary : colors.textSecondary}
                    />
                    <Text style={styles.commentActionText}>
                      {comment.likesCount}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.commentAction}
                    onPress={() => {
                      setReplyToId(comment.id);
                      setCommentText(`@${comment.user.username} `);
                    }}
                  >
                    <Text style={styles.commentActionText}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor={colors.textSecondary}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !commentText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <IconSymbol
              ios_icon_name="arrow.up"
              android_material_icon_name="send"
              size={20}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView >
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
    paddingBottom: spacing.xl,
  },
  mainPost: {
    paddingVertical: spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mainAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.md,
  },
  mainUserInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mainName: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.text,
  },
  mainHandle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  mainContentText: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
    marginBottom: spacing.md,
  },
  mainMedia: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
  },
  timeRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailedTime: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.lg,
  },
  statLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    color: colors.textSecondary,
  },
  mainActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  commentsSection: {
    marginTop: spacing.md,
  },
  commentsTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    fontSize: 18,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  commentItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUsername: {
    fontWeight: '700',
    color: colors.text,
  },
  commentTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  commentContent: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  commentActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  commentInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
});
