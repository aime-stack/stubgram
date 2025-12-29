
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { PremiumHeader } from '@/components/PremiumHeader';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import * as Haptics from 'expo-haptics';

// Flutterwave placeholder - API key should be added here
const FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK-xxxxxxxxxxxxxxxx-X'; // TODO: Add your Flutterwave public key

interface Plan {
    id: 'regular' | 'vip';
    name: string;
    price: number;
    currency: string;
    period: string;
    features: string[];
    highlighted?: boolean;
    gradient: [string, string];
}

const PLANS: Plan[] = [
    {
        id: 'regular',
        name: 'Regular',
        price: 5000,
        currency: 'RWF',
        period: 'month',
        features: [
            'Unlimited posts',
            'Unlimited product listings',
            'Access to marketplace',
            'Limited VIP interactions',
            'Basic analytics',
        ],
        gradient: ['#667eea', '#764ba2'],
    },
    {
        id: 'vip',
        name: 'VIP',
        price: 50000,
        currency: 'RWF',
        period: 'month',
        features: [
            'All Regular features',
            'VIP profile badge ✓',
            'Lower cost for celebrity interactions',
            'Access to VIP Chat Rooms',
            'Priority support',
            'Exclusive content access',
            'Advanced analytics',
        ],
        highlighted: true,
        gradient: ['#f093fb', '#f5576c'],
    },
];

export default function PremiumScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { balance } = useWalletStore();
    const [selectedPlan, setSelectedPlan] = useState<'regular' | 'vip' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubscribe = async (plan: Plan) => {
        if (!user) {
            Alert.alert('Login Required', 'Please login to subscribe to a plan.');
            return;
        }

        setSelectedPlan(plan.id);
        setIsProcessing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // TODO: Integrate Flutterwave payment
            // This is a placeholder for the payment flow
            // When you have Flutterwave API keys, implement:
            // 1. Initialize Flutterwave with public key
            // 2. Create payment modal/redirect
            // 3. Handle callback with payment verification

            Alert.alert(
                'Flutterwave Integration Required',
                `To subscribe to ${plan.name} (${plan.price} ${plan.currency}/${plan.period}), Flutterwave API integration is needed.\n\nAdd your Flutterwave API keys to enable payments.`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Payment error:', error);
            Alert.alert('Error', 'Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
            setSelectedPlan(null);
        }
    };

    const handlePayWithWallet = async (plan: Plan) => {
        if (!user) {
            Alert.alert('Login Required', 'Please login to subscribe.');
            return;
        }

        // Convert RWF to coins (1000 coins = 1000 RWF)
        const coinsNeeded = plan.price;

        if (balance < coinsNeeded) {
            Alert.alert(
                'Insufficient Balance',
                `You need ${coinsNeeded} coins. Your balance: ${balance} coins.\n\nWould you like to top up your wallet?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Top Up', onPress: () => router.push('/(drawer)/(tabs)/wallet') },
                ]
            );
            return;
        }

        Alert.alert(
            'Confirm Subscription',
            `Subscribe to ${plan.name} for ${coinsNeeded} coins?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Subscribe',
                    onPress: async () => {
                        setSelectedPlan(plan.id);
                        setIsProcessing(true);

                        // TODO: Implement actual subscription logic via API
                        await new Promise(resolve => setTimeout(resolve, 1500));

                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('Success!', `You are now subscribed to ${plan.name}!`);

                        setIsProcessing(false);
                        setSelectedPlan(null);
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <PremiumHeader 
                title="Premium Plans" 
                subtitle="Unlock exclusive features"
                iosIconName="star.fill"
                androidIconName="star"
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Upgrade to Premium</Text>
                    <Text style={styles.subtitle}>
                        Unlock exclusive features and enhance your Stubgram experience
                    </Text>
                </View>
                {/* Plans */}
                {PLANS.map((plan) => (
                    <View key={plan.id} style={styles.planWrapper}>
                        {plan.highlighted && (
                            <View style={styles.popularBadge}>
                                <Text style={styles.popularText}>MOST POPULAR</Text>
                            </View>
                        )}
                        <LinearGradient
                            colors={plan.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.planCard, plan.highlighted && styles.planCardHighlighted]}
                        >
                            <Text style={styles.planName}>{plan.name}</Text>
                            <View style={styles.priceRow}>
                                <Text style={styles.price}>{plan.price.toLocaleString()}</Text>
                                <Text style={styles.currency}>{plan.currency}/{plan.period}</Text>
                            </View>

                            <View style={styles.features}>
                                {plan.features.map((feature, index) => (
                                    <View key={index} style={styles.featureRow}>
                                        <IconSymbol
                                            ios_icon_name="checkmark.circle.fill"
                                            android_material_icon_name="check-circle"
                                            size={20}
                                            color="#FFFFFF"
                                        />
                                        <Text style={styles.featureText}>{feature}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={styles.subscribeButton}
                                    onPress={() => handleSubscribe(plan)}
                                    disabled={isProcessing && selectedPlan === plan.id}
                                >
                                    {isProcessing && selectedPlan === plan.id ? (
                                        <ActivityIndicator color={plan.gradient[0]} size="small" />
                                    ) : (
                                        <>
                                            <IconSymbol ios_icon_name="creditcard.fill" android_material_icon_name="credit-card" size={18} color={plan.gradient[0]} />
                                            <Text style={[styles.subscribeButtonText, { color: plan.gradient[0] }]}>
                                                Pay with Card
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.walletButton}
                                    onPress={() => handlePayWithWallet(plan)}
                                    disabled={isProcessing}
                                >
                                    <Text style={styles.walletButtonText}>Pay with Wallet 🪙</Text>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>
                ))}

                {/* Wallet Balance */}
                <View style={styles.walletInfo}>
                    <Text style={styles.walletLabel}>Your Wallet Balance</Text>
                    <Text style={styles.walletBalance}>{balance.toLocaleString()} 🪙</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    header: {
        marginBottom: spacing.xl,
        alignItems: 'center',
    },
    title: {
        ...typography.h1,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    planWrapper: {
        marginBottom: spacing.xl,
        position: 'relative',
    },
    popularBadge: {
        position: 'absolute',
        top: -12,
        right: 20,
        backgroundColor: '#FFD700',
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
        zIndex: 1,
    },
    popularText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#000',
    },
    planCard: {
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
    },
    planCardHighlighted: {
        transform: [{ scale: 1.02 }],
    },
    planName: {
        ...typography.h2,
        color: '#FFFFFF',
        marginBottom: spacing.sm,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: spacing.lg,
    },
    price: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    currency: {
        ...typography.body,
        color: 'rgba(255,255,255,0.8)',
        marginLeft: spacing.sm,
    },
    features: {
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    featureText: {
        ...typography.body,
        color: '#FFFFFF',
        flex: 1,
    },
    buttonContainer: {
        gap: spacing.sm,
    },
    subscribeButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    subscribeButtonText: {
        ...typography.body,
        fontWeight: '700',
    },
    walletButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    walletButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    walletInfo: {
        backgroundColor: colors.card,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    walletLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    walletBalance: {
        ...typography.h2,
        color: colors.primary,
    },
});
