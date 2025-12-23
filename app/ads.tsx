import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    FlatList,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useWalletStore } from '@/stores/walletStore';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/services/api';
import { supabase } from '@/lib/supabase';

// Ad pricing tiers
const AD_PRICING = [
    { id: 'basic', name: 'Basic', coins: 50, impressions: 500, duration: '1 day' },
    { id: 'standard', name: 'Standard', coins: 150, impressions: 2000, duration: '3 days' },
    { id: 'premium', name: 'Premium', coins: 400, impressions: 5000, duration: '7 days' },
    { id: 'boost', name: 'Super Boost', coins: 1000, impressions: 15000, duration: '14 days' },
];

interface Ad {
    id: string;
    title: string;
    content: string;
    imageUrl?: string;
    linkUrl?: string;
    impressions: number;
    clicks: number;
    budget: number;
    remainingBudget: number;
    status: 'active' | 'paused' | 'completed';
    createdAt: string;
    expiresAt: string;
}

export default function AdsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { balance, spendCoins } = useWalletStore();

    const [activeTab, setActiveTab] = useState<'create' | 'my-ads'>('create');
    const [isLoading, setIsLoading] = useState(false);
    const [myAds, setMyAds] = useState<Ad[]>([]);

    // Create ad form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [selectedTier, setSelectedTier] = useState(AD_PRICING[0]);

    useEffect(() => {
        if (activeTab === 'my-ads') {
            loadMyAds();
        }
    }, [activeTab]);

    const loadMyAds = async () => {
        setIsLoading(true);
        try {
            const { data: ads, error } = await supabase
                .from('ads')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (!error && ads) {
                setMyAds(ads.map(ad => ({
                    id: ad.id,
                    title: ad.title,
                    content: ad.content,
                    imageUrl: ad.image_url,
                    linkUrl: ad.link_url,
                    impressions: ad.impressions || 0,
                    clicks: ad.clicks || 0,
                    budget: ad.budget_coins,
                    remainingBudget: ad.remaining_coins || ad.budget_coins,
                    status: ad.status,
                    createdAt: ad.created_at,
                    expiresAt: ad.expires_at,
                })));
            }
        } catch (error) {
            console.error('Failed to load ads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } catch (error) {
            console.error('Failed to pick image:', error);
        }
    };

    const handleCreateAd = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter an ad title');
            return;
        }
        if (!content.trim()) {
            Alert.alert('Error', 'Please enter ad content');
            return;
        }
        if (balance < selectedTier.coins) {
            Alert.alert('Insufficient Coins', `You need ${selectedTier.coins} coins to create this ad. Your balance: ${balance} coins.`);
            return;
        }

        setIsLoading(true);
        try {
            // Upload image if selected
            let uploadedImageUrl: string | undefined;
            if (imageUri) {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    uploadedImageUrl = await apiClient.uploadMedia(
                        imageUri,
                        'posts',
                        `${authUser.id}/ad_${Date.now()}`
                    );
                }
            }

            // Calculate expiry date
            const durationDays = parseInt(selectedTier.duration.split(' ')[0]);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + durationDays);

            // Create ad in database
            const { data: ad, error } = await supabase
                .from('ads')
                .insert({
                    user_id: user?.id,
                    title: title.trim(),
                    content: content.trim(),
                    image_url: uploadedImageUrl,
                    link_url: linkUrl.trim() || null,
                    budget_coins: selectedTier.coins,
                    remaining_coins: selectedTier.coins,
                    target_impressions: selectedTier.impressions,
                    status: 'active',
                    tier: selectedTier.id,
                    expires_at: expiresAt.toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            // Deduct coins
            const success = await spendCoins(selectedTier.coins, `Ad campaign: ${title.trim()}`);
            if (!success) {
                // Rollback ad creation
                await supabase.from('ads').delete().eq('id', ad.id);
                throw new Error('Failed to process payment');
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                '🎉 Ad Created!',
                `Your ad "${title}" is now live! It will be shown to users across the feed.`,
                [{ text: 'View My Ads', onPress: () => setActiveTab('my-ads') }]
            );

            // Reset form
            setTitle('');
            setContent('');
            setLinkUrl('');
            setImageUri(null);
            setSelectedTier(AD_PRICING[0]);

        } catch (error: any) {
            console.error('Failed to create ad:', error);
            Alert.alert('Error', error.message || 'Failed to create ad. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePauseAd = async (adId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        try {
            await supabase
                .from('ads')
                .update({ status: newStatus })
                .eq('id', adId);

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            loadMyAds();
        } catch (error) {
            console.error('Failed to update ad:', error);
        }
    };

    const renderAdCard = ({ item }: { item: Ad }) => (
        <View style={styles.adCard}>
            {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.adCardImage} />
            )}
            <View style={styles.adCardContent}>
                <View style={styles.adCardHeader}>
                    <Text style={styles.adCardTitle}>{item.title}</Text>
                    <View style={[
                        styles.statusBadge,
                        item.status === 'active' && styles.statusActive,
                        item.status === 'paused' && styles.statusPaused,
                        item.status === 'completed' && styles.statusCompleted,
                    ]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>
                <Text style={styles.adCardDescription} numberOfLines={2}>{item.content}</Text>

                <View style={styles.adStats}>
                    <View style={styles.statItem}>
                        <IconSymbol ios_icon_name="eye" android_material_icon_name="visibility" size={16} color={colors.textSecondary} />
                        <Text style={styles.statValue}>{item.impressions}</Text>
                        <Text style={styles.statLabel}>Views</Text>
                    </View>
                    <View style={styles.statItem}>
                        <IconSymbol ios_icon_name="hand.tap" android_material_icon_name="touch-app" size={16} color={colors.textSecondary} />
                        <Text style={styles.statValue}>{item.clicks}</Text>
                        <Text style={styles.statLabel}>Clicks</Text>
                    </View>
                    <View style={styles.statItem}>
                        <IconSymbol ios_icon_name="bitcoinsign.circle" android_material_icon_name="monetization-on" size={16} color={colors.accent} />
                        <Text style={styles.statValue}>{item.remainingBudget}</Text>
                        <Text style={styles.statLabel}>Left</Text>
                    </View>
                </View>

                {item.status !== 'completed' && (
                    <TouchableOpacity
                        style={[styles.actionButton, item.status === 'paused' && styles.actionButtonActive]}
                        onPress={() => handlePauseAd(item.id, item.status)}
                    >
                        <Text style={styles.actionButtonText}>
                            {item.status === 'active' ? 'Pause Ad' : 'Resume Ad'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Advertising',
                    headerShown: true,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
            />

            {/* Wallet Balance Banner */}
            <View style={styles.balanceBanner}>
                <IconSymbol ios_icon_name="bitcoinsign.circle.fill" android_material_icon_name="monetization-on" size={24} color={colors.accent} />
                <Text style={styles.balanceText}>Your Balance: <Text style={styles.balanceAmount}>{balance} coins</Text></Text>
                <TouchableOpacity onPress={() => router.push('/wallet')} style={styles.topUpButton}>
                    <Text style={styles.topUpText}>Top Up</Text>
                </TouchableOpacity>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'create' && styles.tabActive]}
                    onPress={() => setActiveTab('create')}
                >
                    <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>Create Ad</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'my-ads' && styles.tabActive]}
                    onPress={() => setActiveTab('my-ads')}
                >
                    <Text style={[styles.tabText, activeTab === 'my-ads' && styles.tabTextActive]}>My Ads</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'create' ? (
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={100}
                >
                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    >
                        {/* Ad Title */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Ad Title *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter a catchy title"
                                placeholderTextColor={colors.textSecondary}
                                value={title}
                                onChangeText={setTitle}
                                maxLength={50}
                            />
                            <Text style={styles.charCount}>{title.length}/50</Text>
                        </View>

                        {/* Ad Content */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Ad Content *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Describe your product, service, or promotion..."
                                placeholderTextColor={colors.textSecondary}
                                value={content}
                                onChangeText={setContent}
                                multiline
                                numberOfLines={4}
                                maxLength={280}
                                textAlignVertical="top"
                            />
                            <Text style={styles.charCount}>{content.length}/280</Text>
                        </View>

                        {/* Image Upload */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Ad Image (Optional)</Text>
                            <TouchableOpacity style={styles.imageUpload} onPress={handlePickImage}>
                                {imageUri ? (
                                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                                ) : (
                                    <View style={styles.uploadPlaceholder}>
                                        <IconSymbol ios_icon_name="photo.badge.plus" android_material_icon_name="add-photo-alternate" size={40} color={colors.textSecondary} />
                                        <Text style={styles.uploadText}>Tap to add image</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Link URL */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Link URL (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://yourwebsite.com"
                                placeholderTextColor={colors.textSecondary}
                                value={linkUrl}
                                onChangeText={setLinkUrl}
                                keyboardType="url"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Pricing Tiers */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Select Package</Text>
                            <View style={styles.tiersContainer}>
                                {AD_PRICING.map((tier) => (
                                    <TouchableOpacity
                                        key={tier.id}
                                        style={[
                                            styles.tierCard,
                                            selectedTier.id === tier.id && styles.tierCardSelected,
                                        ]}
                                        onPress={() => {
                                            setSelectedTier(tier);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    >
                                        <Text style={[styles.tierName, selectedTier.id === tier.id && styles.tierNameSelected]}>
                                            {tier.name}
                                        </Text>
                                        <View style={styles.tierCoins}>
                                            <IconSymbol ios_icon_name="bitcoinsign.circle" android_material_icon_name="monetization-on" size={18} color={selectedTier.id === tier.id ? '#FFFFFF' : colors.accent} />
                                            <Text style={[styles.tierCoinsText, selectedTier.id === tier.id && styles.tierCoinsTextSelected]}>
                                                {tier.coins}
                                            </Text>
                                        </View>
                                        <Text style={[styles.tierDetails, selectedTier.id === tier.id && styles.tierDetailsSelected]}>
                                            {tier.impressions.toLocaleString()} views
                                        </Text>
                                        <Text style={[styles.tierDuration, selectedTier.id === tier.id && styles.tierDurationSelected]}>
                                            {tier.duration}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Create Button */}
                        <TouchableOpacity
                            style={[styles.createButton, isLoading && styles.createButtonDisabled]}
                            onPress={handleCreateAd}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={styles.createButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <IconSymbol ios_icon_name="megaphone.fill" android_material_icon_name="campaign" size={22} color="#FFFFFF" />
                                        <Text style={styles.createButtonText}>
                                            Launch Ad for {selectedTier.coins} Coins
                                        </Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                <View style={{ flex: 1 }}>
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : myAds.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <IconSymbol ios_icon_name="megaphone" android_material_icon_name="campaign" size={64} color={colors.textSecondary} />
                            <Text style={styles.emptyTitle}>No Ads Yet</Text>
                            <Text style={styles.emptyText}>Create your first ad to start reaching users!</Text>
                            <TouchableOpacity style={styles.emptyButton} onPress={() => setActiveTab('create')}>
                                <Text style={styles.emptyButtonText}>Create Ad</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={myAds}
                            renderItem={renderAdCard}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 20 }}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    balanceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.md,
        gap: spacing.sm,
    },
    balanceText: {
        ...typography.body,
        color: colors.text,
        flex: 1,
    },
    balanceAmount: {
        fontWeight: '700',
        color: colors.accent,
    },
    topUpButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    topUpText: {
        ...typography.caption,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
    },
    tabText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    tabTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        ...typography.caption,
        color: colors.text,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        ...typography.body,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        ...typography.small,
        color: colors.textSecondary,
        textAlign: 'right',
        marginTop: spacing.xs,
    },
    imageUpload: {
        height: 180,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    uploadPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    uploadText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    tiersContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    tierCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
    },
    tierCardSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    tierName: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    tierNameSelected: {
        color: '#FFFFFF',
    },
    tierCoins: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tierCoinsText: {
        ...typography.h3,
        color: colors.accent,
        fontWeight: '700',
    },
    tierCoinsTextSelected: {
        color: '#FFFFFF',
    },
    tierDetails: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    tierDetailsSelected: {
        color: 'rgba(255,255,255,0.8)',
    },
    tierDuration: {
        ...typography.small,
        color: colors.textSecondary,
    },
    tierDurationSelected: {
        color: 'rgba(255,255,255,0.8)',
    },
    createButton: {
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        marginTop: spacing.lg,
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    createButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyTitle: {
        ...typography.h2,
        color: colors.text,
        marginTop: spacing.lg,
    },
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    emptyButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        marginTop: spacing.lg,
    },
    emptyButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    adCard: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    adCardImage: {
        width: '100%',
        height: 150,
    },
    adCardContent: {
        padding: spacing.md,
    },
    adCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    adCardTitle: {
        ...typography.body,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.border,
    },
    statusActive: {
        backgroundColor: colors.highlight,
    },
    statusPaused: {
        backgroundColor: colors.warning,
    },
    statusCompleted: {
        backgroundColor: colors.textSecondary,
    },
    statusText: {
        ...typography.small,
        color: '#FFFFFF',
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    adCardDescription: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    adStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    statItem: {
        alignItems: 'center',
        gap: 2,
    },
    statValue: {
        ...typography.body,
        fontWeight: '700',
        color: colors.text,
    },
    statLabel: {
        ...typography.small,
        color: colors.textSecondary,
    },
    actionButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.border,
        alignItems: 'center',
    },
    actionButtonActive: {
        backgroundColor: colors.primary,
    },
    actionButtonText: {
        ...typography.caption,
        color: colors.text,
        fontWeight: '600',
    },
});
