import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    FlatList,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { livekitService } from '@/services/livekit';
import { useSpacePresence } from '@/hooks/useSpacePresence';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';
import { RoomEvent, ConnectionQuality, Participant } from 'livekit-client';
import * as Network from 'expo-network';
import * as Haptics from 'expo-haptics';

export default function SpaceRoomScreen() {
    const router = useRouter();
    const { id: spaceId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const network = useNetworkQuality();

    const [isConnecting, setIsConnecting] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [networkQuality, setNetworkQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);

    // Bandwidth-aware presence tracking
    const { participants: presenceParticipants, updatePresence } = useSpacePresence(spaceId || null);

    const connectToSpace = useCallback(async () => {
        if (!spaceId || !user || !network.isConnected) return;

        try {
            setIsConnecting(true);

            // 1. Generate token via Edge Function
            const { data, error } = await supabase.functions.invoke('generate-token', {
                body: { spaceId },
            });

            if (error) throw error;

            // 2. Connect to LiveKit
            const connectedRoom = await livekitService.connect(data.wsUrl, data.token);

            // 3. Monitor quality
            connectedRoom.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality, p: Participant) => {
                if (p.isLocal) {
                    setNetworkQuality(quality);
                    // Automatic degradation: If quality is POOR, force video OFF
                    if (quality === ConnectionQuality.Poor && isCameraOn) {
                        livekitService.disableVideo();
                        setIsCameraOn(false);
                        updatePresence({ hasVideo: false });
                        Alert.alert('Data Saving', 'Video disabled to protect your connection quality.');
                    }
                }
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error('Connection error:', error);
            if (network.isConnected) {
                Alert.alert('Connection Failed', error.message || 'Could not join.');
                router.back();
            }
        } finally {
            setIsConnecting(false);
        }
    }, [spaceId, user, network.isConnected]);

    useEffect(() => {
        connectToSpace();
        return () => {
            livekitService.disconnect();
        };
    }, [connectToSpace]);

    // Auto-reconnect flow
    useEffect(() => {
        if (network.isConnected && !isConnecting && !livekitService.getRoom()) {
            connectToSpace();
        }
    }, [network.isConnected]);

    const handleToggleMute = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newMuteState = await livekitService.toggleMute();
        setIsMuted(newMuteState ?? true);
        updatePresence({ isMuted: newMuteState });
    };

    const handleToggleCamera = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (!isCameraOn && network.type === Network.NetworkStateType.CELLULAR) {
            Alert.alert(
                'Data Usage',
                'Video uses more data. Continue on cellular?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Enable', onPress: async () => {
                            await livekitService.enableVideo();
                            setIsCameraOn(true);
                            updatePresence({ hasVideo: true });
                        }
                    }
                ]
            );
            return;
        }

        if (isCameraOn) {
            await livekitService.disableVideo();
            setIsCameraOn(false);
            updatePresence({ hasVideo: false });
        } else {
            await livekitService.enableVideo();
            setIsCameraOn(true);
            updatePresence({ hasVideo: true });
        }
    };

    const handleLeaveRoom = () => {
        Alert.alert(
            'Leave Space',
            'Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: () => {
                        livekitService.disconnect();
                        router.back();
                    },
                },
            ]
        );
    };

    const renderParticipant = ({ item }: { item: any }) => {
        const isSelf = item.userId === user?.id;

        return (
            <View style={styles.participantCard}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: item.user?.avatar || 'https://via.placeholder.com/80' }}
                        style={[styles.avatar, item.hasVideo && styles.avatarWithVideo]}
                    />
                    {item.isMuted && (
                        <View style={styles.muteBadge}>
                            <IconSymbol ios_icon_name="mic.slash.fill" android_material_icon_name="mic-off" size={12} color="#FFFFFF" />
                        </View>
                    )}
                </View>
                <Text style={styles.participantName} numberOfLines={1}>
                    {isSelf ? 'You' : `@${item.user?.username || 'user'}`}
                </Text>
            </View>
        );
    };

    if (isConnecting) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Connecting to Space...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Offline Banner */}
            {!network.isConnected && (
                <View style={styles.offlineBanner}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.offlineText}>Network Lost. Waiting to reconnect...</Text>
                </View>
            )}

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleLeaveRoom}>
                    <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.roomInfo}>
                    <View style={styles.liveBadge}>
                        <View style={styles.liveIndicator} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>

                    <View style={styles.qualityIndicator}>
                        <IconSymbol
                            ios_icon_name="antenna.radiowaves.left.and.right"
                            android_material_icon_name="signal-cellular-alt"
                            size={16}
                            color={
                                networkQuality === ConnectionQuality.Excellent ? '#4CAF50' :
                                    networkQuality === ConnectionQuality.Poor ? '#FFC107' : '#FFFFFF'
                            }
                        />
                        <Text style={styles.qualityText}>
                            {networkQuality === ConnectionQuality.Poor ? 'Weak Signal' : 'Connected'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.leaveBtnSmall} onPress={handleLeaveRoom}>
                    <Text style={styles.leaveText}>Leave</Text>
                </TouchableOpacity>
            </View>

            {/* Participant Grid */}
            <View style={styles.content}>
                <FlatList
                    data={presenceParticipants}
                    renderItem={renderParticipant}
                    keyExtractor={(item) => item.userId}
                    numColumns={3}
                    contentContainerStyle={styles.grid}
                />
            </View>

            {/* Control Bar */}
            <View style={[styles.controlBar, { paddingBottom: insets.bottom + spacing.md }]}>
                {/* Bandwidth Saving Active */}
                <View style={styles.dataBadge}>
                    <IconSymbol ios_icon_name="leaf.fill" android_material_icon_name="eco" size={12} color="#4CAF50" />
                    <Text style={styles.dataBadgeText}>Audio-First Optimized</Text>
                </View>

                <TouchableOpacity style={styles.controlBtn} onPress={handleToggleMute}>
                    <View style={[styles.iconCircle, isMuted && styles.iconCircleMuted]}>
                        <IconSymbol
                            ios_icon_name={isMuted ? "mic.slash.fill" : "mic.fill"}
                            android_material_icon_name={isMuted ? "mic-off" : "mic"}
                            size={24}
                            color="#FFFFFF"
                        />
                    </View>
                    <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlBtn} onPress={handleToggleCamera}>
                    <View style={[styles.iconCircle, isCameraOn && styles.iconCircleVideo]}>
                        <IconSymbol
                            ios_icon_name={isCameraOn ? "video.fill" : "video.slash.fill"}
                            android_material_icon_name={isCameraOn ? "videocam" : "videocam-off"}
                            size={24}
                            color="#FFFFFF"
                        />
                    </View>
                    <Text style={styles.controlLabel}>{isCameraOn ? 'Video ON' : 'Video OFF'}</Text>
                </TouchableOpacity>
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
        backgroundColor: colors.background,
    },
    loadingText: {
        ...typography.h3,
        color: colors.text,
        marginTop: spacing.md,
    },
    offlineBanner: {
        backgroundColor: colors.error,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 8,
    },
    offlineText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 8,
    },
    roomInfo: {
        alignItems: 'center',
        gap: 2,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF0000',
        paddingHorizontal: spacing.sm,
        paddingVertical: 1,
        borderRadius: borderRadius.sm,
        gap: 4,
    },
    liveIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
    },
    liveText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    qualityIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    qualityText: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    leaveBtnSmall: {
        paddingVertical: 4,
        paddingHorizontal: 16,
        backgroundColor: colors.error + '15',
        borderRadius: borderRadius.full,
    },
    leaveText: {
        color: colors.error,
        fontWeight: '700',
        fontSize: 12,
    },
    content: {
        flex: 1,
    },
    grid: {
        padding: spacing.md,
    },
    participantCard: {
        flex: 1 / 3,
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 4,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: colors.border,
    },
    avatarWithVideo: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    muteBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.error,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    participantName: {
        ...typography.caption,
        color: colors.text,
        fontWeight: '600',
        textAlign: 'center',
        width: '100%',
    },
    controlBar: {
        paddingVertical: spacing.md,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    dataBadge: {
        position: 'absolute',
        top: -24,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF5020',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        gap: 4,
    },
    dataBadgeText: {
        fontSize: 10,
        color: '#4CAF50',
        fontWeight: '700',
    },
    controlBtn: {
        alignItems: 'center',
        gap: 4,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircleMuted: {
        backgroundColor: colors.error,
    },
    iconCircleVideo: {
        backgroundColor: colors.primary,
    },
    controlLabel: {
        ...typography.caption,
        color: colors.text,
        fontWeight: '600',
    },
});
