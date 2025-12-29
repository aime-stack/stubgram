
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
import * as Haptics from 'expo-haptics';

// Mock Rwandan Celebrities/Influencers
const CELEBRITIES = [
    {
        id: 'celeb1',
        username: 'MeddieSsentongo',
        fullName: 'Meddy',
        avatar: 'https://via.placeholder.com/80?text=Meddy',
        bio: 'Rwandan R&B/Afrobeat Artist 🎵',
        isVerified: true,
        isCelebrity: true,
        messagePrice: 500,
        followersCount: 1200000,
    },
    {
        id: 'celeb2',
        username: 'BruceMelody',
        fullName: 'Bruce Melodie',
        avatar: 'https://via.placeholder.com/80?text=Bruce',
        bio: 'Afrobeat & Pop Singer 🇷🇼',
        isVerified: true,
        isCelebrity: true,
        messagePrice: 450,
        followersCount: 980000,
    },
    {
        id: 'celeb3',
        username: 'TheReal_King_James',
        fullName: 'King James',
        avatar: 'https://via.placeholder.com/80?text=KJ',
        bio: 'Rapper | Producer | Artist',
        isVerified: true,
        isCelebrity: true,
        messagePrice: 400,
        followersCount: 750000,
    },
    {
        id: 'celeb4',
        username: 'CharleneRuto',
        fullName: 'Charlene Ruto',
        avatar: 'https://via.placeholder.com/80?text=CR',
        bio: 'Lifestyle & Fashion Influencer ✨',
        isVerified: true,
        isCelebrity: true,
        messagePrice: 350,
        followersCount: 620000,
    },
    {
        id: 'celeb5',
        username: 'MisRwanda_Official',
        fullName: 'Miss Rwanda',
        avatar: 'https://via.placeholder.com/80?text=MR',
        bio: 'Beauty Queen 👑 | Ambassador',
        isVerified: true,
        isCelebrity: true,
        messagePrice: 400,
        followersCount: 540000,
    },
    {
        id: 'celeb6',
        username: 'ClaireMuvunyi',
        fullName: 'Claire Muvunyi',
        avatar: 'https://via.placeholder.com/80?text=CM',
        bio: 'Actress | TV Host | Model',
        isVerified: true,
        isCelebrity: true,
        messagePrice: 300,
        followersCount: 430000,
    },
];

interface Message {
    id: string;
    senderId: string;
    content: string;
    timestamp: Date;
    isRead: boolean;
}

export default function CelebritiesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [celebrities, setCelebrities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadCelebrities();
    }, []);

    const loadCelebrities = async () => {
        try {
            const { data } = await apiClient.getCelebrities();
            setCelebrities(data);
        } catch (error) {
            console.error('Failed to load celebrities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderCelebrity = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.celebrityCard}
            onPress={() => router.push(`/celebrity-chat/${item.id}` as any)}
        >
            <Image source={{ uri: item.avatar || 'https://via.placeholder.com/80' }} style={styles.avatar} />
            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.full_name}</Text>
                    {item.isVerified && (
                        <IconSymbol
                            ios_icon_name="checkmark.seal.fill"
                            android_material_icon_name="verified"
                            size={16}
                            color={colors.primary}
                        />
                    )}
                    {item.isCelebrity && (
                        <View style={styles.vipBadge}>
                            <Text style={styles.vipBadgeText}>VIP</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.username}>@{item.username}</Text>
                <Text style={styles.bio} numberOfLines={1}>{item.bio || 'No bio available'}</Text>
            </View>
            <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>Per Message</Text>
                <Text style={styles.price}>{item.messagePrice || 500} 🪙</Text>
                <TouchableOpacity style={styles.chatButton}>
                    <IconSymbol ios_icon_name="message.fill" android_material_icon_name="chat" size={16} color="#FFFFFF" />
                    <Text style={styles.chatButtonText}>Chat</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader 
                title="Celebrity VIP Chat" 
                subtitle="Chat directly with your favorite stars"
                iosIconName="star.fill"
                androidIconName="star"
            />

            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={celebrities}
                    renderItem={renderCelebrity}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', padding: 40 }}>
                            <Text style={{ color: colors.textSecondary }}>No celebrities found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        padding: spacing.md,
        gap: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    bannerText: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    celebrityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.border,
        marginRight: spacing.md,
    },
    info: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: 2,
    },
    name: {
        ...typography.body,
        fontWeight: '700',
        color: colors.text,
    },
    vipBadge: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    vipBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#000',
    },
    username: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    bio: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    priceColumn: {
        alignItems: 'center',
    },
    priceLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    price: {
        ...typography.body,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: spacing.sm,
    },
    chatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        gap: 4,
    },
    chatButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 12,
    },
});
