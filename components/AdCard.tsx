import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Linking,
    Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';

const { width } = Dimensions.get('window');

interface AdCardProps {
    ad: {
        id: string;
        title: string;
        content: string;
        imageUrl?: string;
        linkUrl?: string;
        tier?: string;
    };
}

export function AdCard({ ad }: AdCardProps) {
    const { isDark } = useThemeStore();
    const themeColors = isDark ? darkColors : lightColors;

    // Record impression when ad is viewed
    useEffect(() => {
        apiClient.recordAdImpression(ad.id).catch(console.error);
    }, [ad.id]);

    const handlePress = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Record click
        await apiClient.recordAdClick(ad.id).catch(console.error);

        // Open link if available
        if (ad.linkUrl) {
            try {
                await Linking.openURL(ad.linkUrl);
            } catch (error) {
                console.error('Failed to open URL:', error);
            }
        }
    };

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={handlePress}
            activeOpacity={0.9}
        >
            {/* Sponsored Badge */}
            <View style={styles.sponsoredBadge}>
                <IconSymbol ios_icon_name="megaphone.fill" android_material_icon_name="campaign" size={12} color={themeColors.textSecondary} />
                <Text style={[styles.sponsoredText, { color: themeColors.textSecondary }]}>Sponsored</Text>
            </View>

            {/* Ad Content */}
            <View style={styles.content}>
                <Text style={[styles.title, { color: themeColors.text }]}>{ad.title}</Text>
                <Text style={[styles.description, { color: themeColors.textSecondary }]} numberOfLines={3}>{ad.content}</Text>
            </View>

            {/* Ad Image */}
            {ad.imageUrl && (
                <Image source={{ uri: ad.imageUrl }} style={styles.image} resizeMode="cover" />
            )}

            {/* CTA */}
            {ad.linkUrl && (
                <View style={[styles.ctaContainer, { borderTopColor: themeColors.border }]}>
                    <Text style={[styles.ctaText, { color: themeColors.primary }]}>Learn More</Text>
                    <IconSymbol ios_icon_name="arrow.right" android_material_icon_name="arrow-forward" size={16} color={themeColors.primary} />
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    sponsoredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
    },
    sponsoredText: {
        ...typography.small,
        color: colors.textSecondary,
    },
    content: {
        padding: spacing.md,
        paddingTop: spacing.sm,
    },
    title: {
        ...typography.body,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    description: {
        ...typography.caption,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    image: {
        width: '100%',
        height: 180,
    },
    ctaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: spacing.xs,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    ctaText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
    },
});
