
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { PremiumHeader } from '@/components/PremiumHeader';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { apiClient } from '@/services/api';
import { Message } from '@/types';
import * as Haptics from 'expo-haptics';


export default function CelebrityChatScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>(); // This is the celebrity user ID
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { balance, addCoins } = useWalletStore();
    const flatListRef = useRef<FlatList>(null);

    const [conversation, setConversation] = useState<any>(null);
    const [celebrity, setCelebrity] = useState<any>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load celebrity and conversation
    useEffect(() => {
        const initChat = async () => {
            try {
                // 1. Get Celebrity Profile
                const { data: profileData } = await apiClient.getUserProfile(id);
                setCelebrity(profileData);

                // 2. Get/Create Conversation
                const { data: convData } = await apiClient.createConversation(id);
                setConversation(convData);

                // 3. Load Messages
                if (convData) {
                    const { data: msgs } = await apiClient.getMessages(convData.id);
                    setMessages(msgs);
                }
            } catch (error) {
                console.error('Failed to init chat:', error);
                Alert.alert('Error', 'Failed to load chat');
            } finally {
                setIsLoading(false);
            }
        };

        if (id && user) {
            initChat();
        }
    }, [id, user]);

    // Real-time updates (poll for now, Supabase realtime later if requested)
    useEffect(() => {
        if (!conversation?.id) return;

        const interval = setInterval(async () => {
            try {
                const { data: msgs } = await apiClient.getMessages(conversation.id);
                // Simple diff check could be here, but for now just replace
                setMessages(msgs);
            } catch (error) {
                // Silent fail on poll
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [conversation?.id]);

    const handleSendMessage = async () => {
        if (!inputText.trim() || !conversation) return;

        // Check wallet balance
        const price = celebrity.isCelebrity ? (celebrity.messagePrice || 500) : 0;

        if (price > 0 && balance < price) {
            Alert.alert(
                'Insufficient Balance',
                `Sending a message costs ${price} coins. Your balance: ${balance} coins.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Top Up', onPress: () => router.push('/(drawer)/(tabs)/wallet') },
                ]
            );
            return;
        }

        setIsSending(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            // Deduct coins if needed
            if (price > 0) {
                addCoins(-price, `Message to ${celebrity.full_name}`);
            }

            // Send message
            const { data: newMessage } = await apiClient.sendMessage(conversation.id, inputText.trim());

            setMessages((prev) => [...prev, newMessage]);
            setInputText('');

            // Scroll to bottom
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);

            // Mock auto-reply for demo purposes
            if (celebrity.isCelebrity) {
                setTimeout(async () => {
                    setIsTyping(true);
                    setTimeout(async () => {
                        const replies = [
                            "Hey! Thanks for messaging. I love your energy! ✨",
                            "That's so interesting! I'm glad we're talking. 🙌",
                            "I'm a bit busy on set right now, but I'll try to reply more soon! 🎬",
                            "Keep being awesome! Your support means the world to me. ❤️",
                        ];
                        const randomReply = replies[Math.floor(Math.random() * replies.length)];

                        // We push a "fake" message for visual feedback in demo
                        const mockMsg: Message = {
                            id: Date.now().toString(),
                            conversationId: conversation.id,
                            senderId: id,
                            content: randomReply,
                            createdAt: new Date().toISOString(),
                            isRead: false,
                            sender: {
                                id: id,
                                username: celebrity.username,
                                avatar: celebrity.avatar,
                            } as any
                        };
                        setMessages((prev) => [...prev, mockMsg]);
                        setIsTyping(false);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }, 2000);
                }, 1000);
            }

        } catch (error: any) {
            console.error('Failed to send:', error);
            Alert.alert('Error', `Failed to send message: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSending(false);
        }
    };

    // Auto-scroll on load
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
        }
    }, [isLoading]);

    const renderMessage = ({ item }: { item: Message }) => {
        const isMine = item.senderId === user?.id; // Or use item.isMine from API
        return (
            <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
                {!isMine && (
                    <Image source={{ uri: celebrity?.avatar || 'https://via.placeholder.com/40' }} style={styles.messageAvatar} />
                )}
                <View style={[styles.messageContent, isMine ? styles.myMessageContent : styles.theirMessageContent]}>
                    <Text style={[styles.messageText, isMine && styles.myMessageText]}>{item.content}</Text>
                    <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        )
    };

    if (isLoading || !celebrity) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <PremiumHeader 
                title={celebrity.full_name}
                subtitle={celebrity.isOnline ? 'Online' : 'Offline'}
                showBackButton={true}
                rightElement={
                    <View style={styles.headerTitle}>
                        <Image source={{ uri: celebrity.avatar || 'https://via.placeholder.com/40' }} style={styles.headerAvatar} />
                        {celebrity.isVerified && (
                             <View style={{ marginLeft: -10, marginTop: 22, backgroundColor: '#FFFFFF', borderRadius: 7 }}>
                                <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={12} color={colors.primary} />
                             </View>
                        )}
                    </View>
                }
            />

            {/* Price Banner */}
            {celebrity.isCelebrity && (
                <View style={styles.priceBanner}>
                    <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={16} color={colors.textSecondary} />
                    <Text style={styles.priceText}>
                        Each message costs <Text style={styles.priceAmount}>{celebrity.messagePrice || 500} 🪙</Text>
                    </Text>
                    <Text style={styles.balanceText}>Balance: {balance} 🪙</Text>
                </View>
            )}

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textSecondary}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={!inputText.trim() || isSending}
                >
                    {isSending ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={20} color="#FFFFFF" />
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
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.border,
    },
    headerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerName: {
        ...typography.body,
        fontWeight: '700',
        color: colors.text,
    },
    headerStatus: {
        ...typography.caption,
        color: '#4CAF50',
    },
    priceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        padding: spacing.sm,
        gap: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    priceText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    priceAmount: {
        fontWeight: '700',
        color: colors.primary,
    },
    balanceText: {
        ...typography.caption,
        color: colors.text,
        fontWeight: '600',
    },
    messagesList: {
        padding: spacing.md,
        paddingBottom: spacing.lg,
    },
    messageBubble: {
        flexDirection: 'row',
        marginBottom: spacing.md,
        maxWidth: '80%',
    },
    myMessage: {
        alignSelf: 'flex-end',
    },
    theirMessage: {
        alignSelf: 'flex-start',
    },
    messageAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: spacing.sm,
        backgroundColor: colors.border,
    },
    messageContent: {
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        maxWidth: '100%',
    },
    myMessageContent: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    theirMessageContent: {
        backgroundColor: colors.card,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        ...typography.body,
        color: colors.text,
    },
    myMessageText: {
        color: '#FFFFFF',
    },
    messageTime: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    myMessageTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    typingAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: spacing.sm,
        backgroundColor: colors.border,
    },
    typingBubble: {
        backgroundColor: colors.card,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
    },
    typingText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: spacing.md,
        paddingBottom: Platform.OS === 'android' ? spacing.md : spacing.xl,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
        gap: spacing.sm,
    },
    input: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        color: colors.text,
        ...typography.body,
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
