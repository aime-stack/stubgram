
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Message, User } from '@/types';
import { apiClient } from '@/services/api';
import { socketService } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';
import * as Haptics from 'expo-haptics';

export default function ConversationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>(); // This is otherUserId
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuthStore();

  const [conversation, setConversation] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(undefined);

  const initChat = useCallback(async () => {

    try {
      // 1. Get Other User Profile
      const { data: profile } = await apiClient.getUserProfile(id);
      setOtherUser(profile);

      // 2. Get/Create Conversation
      const { data: convData } = await apiClient.createConversation(id);
      setConversation(convData);

      // 3. Load Messages
      if (convData) {
        const { data: msgs } = await apiClient.getMessages(convData.id);
        setMessages(msgs); // getMessages returns ordered by asc, list shows top to bottom
      }
    } catch (error) {
      console.error('Failed to init chat:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && currentUser) {
      initChat();
    }
  }, [id, currentUser, initChat]);

  // Socket & Realtime setup
  useEffect(() => {
    if (!conversation?.id) return;

    const conversationId = conversation.id;

    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        // Only add if not mine (mine are added optimistically/via API return)
        // OR just simple dedupe
        setMessages((prev) => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    const handleTypingIndicator = (data: { userId: string; isTyping: boolean }) => {
      // We implicitly know it's for this conversation because of the subscription
      if (data.userId !== currentUser?.id) {
        setIsTyping(data.isTyping);
      }
    };

    // Join conversation room
    socketService.joinConversation(conversationId);

    // Listen for new messages
    socketService.onMessage(conversationId, handleNewMessage);
    socketService.onTyping(conversationId, handleTypingIndicator);

    return () => {
      socketService.leaveConversation(conversationId);
      socketService.offMessage(conversationId);
      socketService.offTyping(conversationId);
    };


  }, [conversation?.id, currentUser?.id]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !conversation) return;

    const tempMessage = messageText;
    setMessageText('');
    setIsSending(true);

    try {
      // Backend Integration - Send message
      const { data: sentMessage } = await apiClient.sendMessage(conversation.id, tempMessage.trim());

      // Update local state
      setMessages((prev) => [...prev, sentMessage]);

      // Also send via WebSocket for real-time delivery
      socketService.sendMessage(conversation.id, tempMessage.trim());

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessageText(tempMessage); // Restore text on error
    } finally {
      setIsSending(false);
    }
  }, [messageText, conversation]);

  const handleTextChange = useCallback((text: string) => {
    setMessageText(text);

    if (!conversation?.id) return;

    // Send typing indicator
    socketService.sendTyping(conversation.id, true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (conversation?.id) {
        socketService.sendTyping(conversation.id, false);
      }
    }, 2000);
  }, [conversation?.id]);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isMine = item.isMine || item.senderId === currentUser?.id;
    const showAvatar = !isMine && (index === 0 || messages[index - 1].senderId !== item.senderId);

    return (
      <View
        style={[
          styles.messageContainer,
          isMine ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isMine && (
          <View style={{ width: 32, marginRight: spacing.xs }}>
            {showAvatar && (
              <Image
                source={{ uri: otherUser?.avatar || 'https://via.placeholder.com/32' }}
                style={styles.messageAvatar}
              />
            )}
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isMine ? styles.ownMessageBubble : styles.otherMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMine ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isMine ? styles.ownMessageTime : styles.otherMessageTime,
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  }, [messages, currentUser, otherUser]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitle: () => (
            <View style={styles.headerInfo}>
              <Image
                source={{ uri: otherUser?.avatar || 'https://via.placeholder.com/32' }}
                style={styles.headerAvatar}
              />
              <View>
                <Text style={styles.headerTitle}>{otherUser?.username || 'Chat'}</Text>
                {isTyping && <Text style={styles.typingIndicator}>typing...</Text>}
              </View>
            </View>
          ),
        }}
      />

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => item.id || `msg-${index}`}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary }}>No messages yet</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity style={styles.attachButton}>
          <IconSymbol
            ios_icon_name="plus.circle"
            android_material_icon_name="add-circle"
            size={28}
            color={colors.primary}
          />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor={colors.textSecondary}
          value={messageText}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || isSending}
        >
          {isSending ? (
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
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
  },
  headerTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  typingIndicator: {
    ...typography.small,
    fontSize: 10,
    color: colors.primary,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  ownMessageBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...typography.body,
    marginBottom: 2,
    color: colors.text
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: colors.text,
  },
  messageTime: {
    ...typography.small,
    fontSize: 10,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  attachButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
