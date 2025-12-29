import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from './IconSymbol';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/commonStyles';

interface PremiumHeaderProps {
    title: string;
    subtitle?: string;
    iosIconName?: string;
    androidIconName?: string;
    onBack?: () => void;
    showBackButton?: boolean;
    rightElement?: React.ReactNode;
}

export const PremiumHeader: React.FC<PremiumHeaderProps> = ({
    title,
    subtitle,
    iosIconName = 'star.fill',
    androidIconName = 'star',
    onBack,
    showBackButton = true,
    rightElement
}) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
            <View style={styles.headerTitleContainer}>
                {showBackButton && (
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <IconSymbol 
                            ios_icon_name="chevron.left" 
                            android_material_icon_name="arrow-back" 
                            size={24} 
                            color={colors.text} 
                        />
                    </TouchableOpacity>
                )}
                <View style={styles.titleWrapper}>
                    <Text style={styles.headerTitleText} numberOfLines={1}>{title}</Text>
                    {subtitle && <Text style={styles.headerSubtitleText} numberOfLines={1}>{subtitle}</Text>}
                </View>
            </View>
            
            <View style={styles.rightContainer}>
                {rightElement ? rightElement : (
                    <View style={styles.headerIconContainer}>
                        <IconSymbol
                            ios_icon_name={iosIconName}
                            android_material_icon_name={androidIconName as any}
                            size={24}
                            color={colors.primary}
                        />
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: spacing.sm,
    },
    backButton: {
        padding: spacing.xs,
        marginRight: spacing.xs,
    },
    titleWrapper: {
        flex: 1,
    },
    headerTitleText: {
        ...typography.h2,
        color: colors.text,
        fontSize: 20,
    },
    headerSubtitleText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    charCount: {
        ...typography.caption,
        color: colors.textSecondary,
        textAlign: 'right',
        marginTop: spacing.xs,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
});
