import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase';
import { VideoSpace } from '@/types';
import { useAuthStore } from '@/stores/authStore';

export default function JoinPreviewScreen() {
    const router = useRouter();
    const { id: spaceId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    const [space, setSpace] = useState<VideoSpace | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSpace = async () => {
            if (!spaceId) return;
            try {
                const { data, error } = await supabase
                    .from('video_spaces')
                    .select('*, host:profiles(*)')
                    .eq('id', spaceId)
                    .single();

                if (error) throw error;
                setSpace(data);
            } catch (error) {
                console.error('Fetch space error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSpace();
    }, [spaceId]);

    const handleJoin = () => {
        router.replace(`/spaces/${spaceId}` as any);
    };

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!space) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Space not found or ended.</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backLink}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ title: 'Join Preview', headerShown: false }} />

            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.content}>
                <View style={styles.previewCard}>
                    <Text style={styles.spaceTitle}>{space.title}</Text>
                    <View style={styles.hostRow}>
                        <Image source={{ uri: space.host?.avatar || 'https://via.placeholder.com/40' }} style={styles.hostAvatar} />
                        <Text style={styles.hostName}>Hosted by @{space.host?.username}</Text>
                    </View>

                    <View style={styles.infoBox}>
                        <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>
                            This is an audio-first space. Your camera is off by default to save data.
                        </Text>
                    </View>
                </View>

                <View style={styles.userPreview}>
                    <Image source={{ uri: user?.avatar || 'https://via.placeholder.com/120' }} style={styles.userAvatar} />
                    <Text style={styles.userName}>@{user?.username}</Text>
                    <Text style={styles.prepText}>Ready to join?</Text>
                </View>

                <View style={styles.actionSection}>
                    <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}>
                        <Text style={styles.joinBtnText}>Join Space</Text>
                    </TouchableOpacity>

                    <View style={styles.networkTip}>
                        <IconSymbol ios_icon_name="wifi" android_material_icon_name="network-check" size={14} color="#4CAF50" />
                        <Text style={styles.networkTipText}>Optimized for low-bandwidth connections</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtn: {
        padding: spacing.md,
        alignSelf: 'flex-start',
    },
    content: {
        flex: 1,
        padding: spacing.xl,
        justifyContent: 'space-between',
        paddingBottom: spacing.xxl * 2,
    },
    previewCard: {
        backgroundColor: colors.card,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    spaceTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: spacing.md,
    },
    hostRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    hostAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    hostName: {
        ...typography.body,
        color: colors.textSecondary,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    userPreview: {
        alignItems: 'center',
        gap: 12,
    },
    userAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: colors.primary + '40',
    },
    userName: {
        ...typography.h3,
        color: colors.text,
    },
    prepText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    actionSection: {
        gap: spacing.md,
    },
    joinBtn: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    joinBtnText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    networkTip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    networkTipText: {
        fontSize: 10,
        color: '#4CAF50',
        fontWeight: '600',
    },
    errorText: {
        ...typography.body,
        color: colors.error,
        marginBottom: 12,
    },
    backLink: {
        color: colors.primary,
        fontWeight: '600',
    },
});
