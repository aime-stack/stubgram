import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* 
  NOTE: In a real implementation, you would fetch these from the 'promotion_tiers' table
  we just created. For this MVP, we can fetch or hardcode as a fallback.
*/

interface Tier {
    id: string;
    name: string;
    cost_rwf: number;
    benefits_json: any;
}

export default function PromoteScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [tiers, setTiers] = useState<Tier[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);

    useEffect(() => {
        loadTiers();
    }, []);

    const loadTiers = async () => {
        try {
            // Fetch from DB
            const { data, error } = await supabase
                .from('promotion_tiers')
                .select('*')
                .order('cost_rwf', { ascending: true });
            
            if (error) throw error;
            setTiers(data || []);
        } catch (error) {
            console.error('Failed to load tiers:', error);
            // Fallback for demo if DB is empty/fails
            setTiers([
                { id: '1', name: 'Basic', cost_rwf: 5000, benefits_json: { badge: 'Supporter', boost: '1.2x' } },
                { id: '2', name: 'Premium', cost_rwf: 15000, benefits_json: { badge: 'Premium', boost: '2.0x', verified: true } },
                { id: '3', name: 'Pro', cost_rwf: 50000, benefits_json: { badge: 'Pro', boost: '5.0x', verified: true, support: 'VIP' } }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (tier: Tier) => {
        setPurchasing(tier.id);
        
        // SIMULATION: In real app, call Paypack API here
        setTimeout(async () => {
            Alert.alert(
                'Purchase Successful', 
                `You have subscribed to ${tier.name} Plan!`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
            
            // TODO: Update user profile with new tier in DB
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('profiles').update({ 
                    account_type: tier.name.toLowerCase() 
                }).eq('id', user.id);
            }
            
            setPurchasing(null);
        }, 2000);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol ios_icon_name="arrow.left" android_material_icon_name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Upgrade Your Account</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Choose a plan to boost your reach and earn more rewards.</Text>

                {tiers.map((tier) => (
                    <LinearGradient
                        key={tier.id}
                        colors={
                            tier.name === 'Pro' ? ['#FFD700', '#FFA500'] :
                            tier.name === 'Premium' ? [colors.primary, colors.secondary] :
                            ['#E0E0E0', '#B0B0B0']
                        }
                        style={styles.tierCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.tierHeader}>
                             <Text style={[styles.tierName, tier.name === 'Basic' && { color: '#333' }]}>{tier.name}</Text>
                             <View style={[styles.priceTag, tier.name === 'Basic' && { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                                <Text style={[styles.priceText, tier.name === 'Basic' && { color: '#333' }]}>{tier.cost_rwf.toLocaleString()} RWF</Text>
                                <Text style={[styles.durationText, tier.name === 'Basic' && { color: '#555' }]}>/ month</Text>
                             </View>
                        </View>

                        <View style={styles.benefitsContainer}>
                            {Object.entries(tier.benefits_json).map(([key, value], index) => (
                                <View key={index} style={styles.benefitItem}>
                                    <IconSymbol 
                                        ios_icon_name="checkmark.circle.fill" 
                                        android_material_icon_name="check-circle" 
                                        size={18} 
                                        color={tier.name === 'Basic' ? '#333' : '#FFF'} 
                                    />
                                    <Text style={[styles.benefitText, tier.name === 'Basic' && { color: '#333' }]}>
                                        {key === 'boost_multiplier' ? `${value}x Reward Boost` : 
                                         key === 'badge' ? `${value} Badge` :
                                         key === 'verification' ? 'Verified Status' :
                                         `${key}: ${value}`}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity 
                            style={[styles.purchaseButton, tier.name === 'Basic' ? styles.btnBasic : styles.btnPremium]}
                            onPress={() => handlePurchase(tier)}
                            disabled={!!purchasing}
                        >
                            {purchasing === tier.id ? (
                                <ActivityIndicator color={tier.name === 'Basic' ? '#FFF' : colors.primary} />
                            ) : (
                                <Text style={[styles.purchaseButtonText, tier.name === 'Basic' ? { color: '#FFF' } : { color: colors.primary }]}>
                                    Subscribe Now
                                </Text>
                            )}
                        </TouchableOpacity>
                    </LinearGradient>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.text,
    },
    backButton: {
        padding: spacing.sm,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 40,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    tierCard: {
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    tierHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    tierName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    priceTag: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: borderRadius.md,
        alignItems: 'flex-end',
    },
    priceText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    durationText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
    },
    benefitsContainer: {
        marginBottom: spacing.lg,
        gap: 8,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    benefitText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    purchaseButton: {
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnBasic: {
         backgroundColor: '#333',
    },
    btnPremium: {
         backgroundColor: '#FFF',
    },
    purchaseButtonText: {
        fontWeight: 'bold',
        fontSize: 16,
        textTransform: 'uppercase',
    },
});
