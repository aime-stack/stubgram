
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { PostCard } from '@/components/PostCard';
import { Post, Comment } from '@/types';
import { apiClient } from '@/services/api';
import { useWalletStore } from '@/stores/walletStore';
import * as Haptics from 'expo-haptics';

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addCoins } = useWalletStore();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Post */}
        <PostCard post={post} />

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
    </KeyboardAvoidingView>
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
    padding: spacing.md,
    paddingBottom: 100,
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
    marginTop: spacing.lg,
  },
  commentsTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
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
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  commentUsername: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  commentTime: {
    ...typography.small,
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
    gap: spacing.xs,
  },
  commentActionText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
    borderRadius: borderRadius.md,
    padding: spacing.md,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
