
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Alert,
    TextInput,
    Modal,
    ActivityIndicator,
    Switch,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { PremiumHeader } from '@/components/PremiumHeader';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { VideoSpace } from '@/types';
import * as Haptics from 'expo-haptics';

export default function SpacesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const [rooms, setRooms] = useState<VideoSpace[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoomTitle, setNewRoomTitle] = useState('');
    const [isAudioOnly, setIsAudioOnly] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const fetchRooms = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('video_spaces')
                .select('*, host:profiles(*)')
                .eq('status', 'live')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRooms(data || []);
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRooms();

        // Subscribe to real-time updates for space status
        const channel = supabase
            .channel('public:video_spaces')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'video_spaces' }, fetchRooms)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchRooms]);

    const handleCreateRoom = async () => {
        if (!newRoomTitle.trim()) {
            Alert.alert('Error', 'Please enter a room title');
            return;
        }

        setIsCreating(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // Call Supabase Edge Function for secure creation
            console.log('[SpacesScreen] Creating space:', newRoomTitle);
            const { data, error } = await supabase.functions.invoke('create-space', {
                body: {
                    title: newRoomTitle.trim(),
                    type: 'public',
                    isAudioOnly: isAudioOnly
                },
            });

            console.log('[SpacesScreen] create-space response:', { data, error });

            if (error) {
                console.error('[SpacesScreen] Edge Function Error:', error);
                throw error;
            }

            setNewRoomTitle('');
            setShowCreateModal(false);

            // Navigate to the room
            router.push(`/spaces/${data.id}` as any);
        } catch (error: any) {
            console.error('Create room error:', error);
            
            // Log full error details for debugging
            if (error.context) {
                try {
                    const responseBody = await error.context.json();
                    console.error('[SpacesScreen] Error context body:', responseBody);
                } catch (e) {
                    console.error('[SpacesScreen] Could not parse error context');
                }
            }

            const errorMessage = error.context?.error?.message || error.message || 'Failed to create space';
            Alert.alert('Error', errorMessage);
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinRoom = (room: VideoSpace) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/spaces/preview/${room.id}` as any);
    };

    const renderRoom = ({ item }: { item: VideoSpace }) => (
        <TouchableOpacity style={styles.roomCard} onPress={() => handleJoinRoom(item)}>
            <LinearGradient
                colors={item.isAudioOnly ? ['#4a5568', '#2d3748'] : ['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.roomGradient}
            >
                <View style={styles.roomHeader}>
                    <View style={styles.liveBadge}>
                        <View style={styles.liveIndicator} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                    <View style={styles.participantsContainer}>
                        <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="group" size={16} color="#FFFFFF" />
                        <Text style={styles.participantsCount}>{item.participantCount}</Text>
                    </View>
                </View>

                <Text style={styles.roomTitle} numberOfLines={2}>{item.title}</Text>

                <View style={styles.hostInfo}>
                    <Image source={{ uri: item.host?.avatar || 'https://via.placeholder.com/50' }} style={styles.hostAvatar} />
                    <Text style={styles.hostName}>Hosted by @{item.host?.username || 'user'}</Text>
                </View>

                <View style={styles.featuresRow}>
                    <View style={styles.featureTag}>
                        <IconSymbol
                            ios_icon_name={item.isAudioOnly ? "mic.fill" : "video.fill"}
                            android_material_icon_name={item.isAudioOnly ? "mic" : "videocam"}
                            size={12}
                            color="#FFFFFF"
                        />
                        <Text style={styles.featureText}>{item.isAudioOnly ? 'Audio Space' : 'Video Space'}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.joinButton} onPress={() => handleJoinRoom(item)}>
                    <IconSymbol
                        ios_icon_name={item.isAudioOnly ? "mic.fill" : "video.fill"}
                        android_material_icon_name={item.isAudioOnly ? "mic" : "videocam"}
                        size={18}
                        color={item.isAudioOnly ? "#4a5568" : "#667eea"}
                    />
                    <Text style={[styles.joinButtonText, { color: item.isAudioOnly ? "#4a5568" : "#667eea" }]}>
                        Enter Space
                    </Text>
                </TouchableOpacity>
            </LinearGradient>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader 
                title="Spaces" 
                subtitle="Join or start a live video conversation"
                iosIconName="video.fill"
                androidIconName="videocam"
            />
            {isLoading && rooms.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={rooms}
                    renderItem={renderRoom}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onRefresh={fetchRooms}
                    refreshing={isLoading}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <IconSymbol ios_icon_name="antenna.radiowaves.left.and.right" android_material_icon_name="podcasts" size={64} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>No active spaces</Text>
                            <Text style={styles.emptySubtext}>Start a conversation now!</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => setShowCreateModal(true)}
            >
                <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.floatingGradient}
                >
                    <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={32} color="#FFFFFF" />
                </LinearGradient>
            </TouchableOpacity>

            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCreateModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCreateModal(false)}
                >
                    <View
                        style={{ width: '100%', justifyContent: 'flex-end' }}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={(e) => e.stopPropagation()}
                            style={styles.modalContent}
                        >
                            <ScrollView
                                bounces={false}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: spacing.md }}
                                style={{ flexShrink: 1 }}
                            >
                                <View style={styles.modalIndicator} />
                                <Text style={styles.modalTitle}>Start a Space</Text>

                                <Text style={styles.inputLabel}>Space Title</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="What's happening?"
                                    placeholderTextColor={colors.textSecondary}
                                    value={newRoomTitle}
                                    onChangeText={setNewRoomTitle}
                                    maxLength={100}
                                    autoFocus
                                />

                                <View style={styles.toggleRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.toggleTitle}>Audio-First Mode</Text>
                                        <Text style={styles.toggleSubtitle}>Optimized for low-bandwidth. Video can be enabled later.</Text>
                                    </View>
                                    <Switch
                                        value={isAudioOnly}
                                        onValueChange={setIsAudioOnly}
                                        trackColor={{ false: colors.border, true: colors.primary }}
                                    />
                                </View>
                            </ScrollView>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => setShowCreateModal(false)}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalCreateButton, isCreating && styles.modalButtonDisabled]}
                                    onPress={handleCreateRoom}
                                    disabled={isCreating}
                                >
                                    {isCreating ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.modalCreateText}>Go Live</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    roomCard: {
        marginBottom: spacing.lg,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    roomGradient: {
        padding: spacing.lg,
    },
    roomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,0,0,0.8)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
        gap: 4,
    },
    liveIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    liveText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    participantsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    participantsCount: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    roomTitle: {
        ...typography.h3,
        color: '#FFFFFF',
        marginBottom: spacing.md,
    },
    hostInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    hostAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        backgroundColor: colors.border,
    },
    hostName: {
        ...typography.caption,
        color: 'rgba(255,255,255,0.8)',
    },
    featuresRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    featureTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        gap: 4,
    },
    featureText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    joinButtonText: {
        ...typography.body,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl * 2,
    },
    emptyText: {
        ...typography.h3,
        color: colors.text,
        marginTop: spacing.lg,
    },
    emptySubtext: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    floatingButton: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
        ...shadows.lg,
    },
    floatingGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
        padding: spacing.xl,
        maxHeight: '80%',
    },
    modalIndicator: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    inputLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    modalInput: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.text,
        ...typography.body,
        marginBottom: spacing.lg,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
        padding: spacing.md,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
    },
    toggleTitle: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
    },
    toggleSubtitle: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    modalCancelText: {
        ...typography.body,
        color: colors.text,
    },
    modalCreateButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    modalButtonDisabled: {
        opacity: 0.6,
    },
    modalCreateText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '700',
    },
});
