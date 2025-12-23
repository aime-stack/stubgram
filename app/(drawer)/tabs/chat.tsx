
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Conversation } from '@/types';
import { apiClient } from '@/services/api';

export default function ChatScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      // TODO: Backend Integration - Fetch conversations
      const response = await apiClient.getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      // Show mock data for development
      setConversations(getMockConversations());
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    router.push(`/conversation/${conversation.id}`);
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diff = now.getTime() - messageDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = item.participants[0];

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
      >
        <Image
          source={{ uri: otherUser.avatar || 'https://via.placeholder.com/50' }}
          style={styles.avatar}
        />
        {item.unreadCount > 0 && <View style={styles.unreadBadge} />}

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.username}>{otherUser.username}</Text>
            {item.lastMessage && (
              <Text style={styles.timestamp}>
                {formatTime(item.lastMessage.createdAt)}
              </Text>
            )}
          </View>
          {item.lastMessage && (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage.content}
            </Text>
          )}
        </View>

        {item.unreadCount > 0 && (
          <View style={styles.unreadCountBadge}>
            <Text style={styles.unreadCountText}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol
        ios_icon_name="message"
        android_material_icon_name="chat-bubble-outline"
        size={64}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptyText}>
        Start chatting with other users
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

function getMockConversations(): Conversation[] {
  return [
    {
      id: '1',
      participants: [
        {
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
      ],
      lastMessage: {
        id: '1',
        conversationId: '1',
        senderId: '1',
        sender: {} as any,
        content: 'Hey! How are you doing?',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      unreadCount: 2,
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      participants: [
        {
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
      ],
      lastMessage: {
        id: '2',
        conversationId: '2',
        senderId: '2',
        sender: {} as any,
        content: 'Thanks for the follow!',
        isRead: true,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      unreadCount: 0,
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    paddingTop: spacing.xxl + 20,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.border,
    marginRight: spacing.md,
  },
  unreadBadge: {
    position: 'absolute',
    left: spacing.md + 38,
    top: spacing.md + 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  username: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  timestamp: {
    ...typography.small,
    color: colors.textSecondary,
  },
  lastMessage: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  unreadCountBadge: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.sm,
  },
  unreadCountText: {
    ...typography.small,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
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
});
