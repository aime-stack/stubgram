
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
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
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
            const { data, error } = await supabase.functions.invoke('create-space', {
                body: {
                    title: newRoomTitle.trim(),
                    type: 'public',
                    isAudioOnly: isAudioOnly
                },
            });

            if (error) throw error;

            setNewRoomTitle('');
            setShowCreateModal(false);
            setIsCreating(false);

            // Navigate to the room
            router.push(`/spaces/${data.id}` as any);
        } catch (error: any) {
            console.error('Create room error:', error);
            Alert.alert('Error', error.message || 'Failed to create room');
            setIsCreating(false);
        }
    };

    const handleJoinRoom = (room: VideoSpace) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Navigate to preview first (Milestone 5)
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
                {/* Room Header */}
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

                {/* Room Title */}
                <Text style={styles.roomTitle} numberOfLines={2}>{item.title}</Text>

                {/* Host Info */}
                <View style={styles.hostInfo}>
                    <Image source={{ uri: item.host?.avatar || 'https://via.placeholder.com/50' }} style={styles.hostAvatar} />
                    <Text style={styles.hostName}>Hosted by @{item.host?.username || 'user'}</Text>
                </View>

                {/* Features Badge */}
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

                {/* Join Button */}
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
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen
                options={{
                    title: 'Spaces',
                    headerShown: true,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
            />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Active Spaces</Text>
                <Text style={styles.headerSubtitle}>Low-bandwidth audio & video rooms</Text>
            </View>

            {/* Room List */}
            {isLoading ? (
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

            {/* Create Room FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowCreateModal(true)}
            >
                <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Create Room Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Start a Space</Text>

                        <Text style={styles.inputLabel}>Title</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="What's happening?"
                            placeholderTextColor={colors.textSecondary}
                            value={newRoomTitle}
                            onChangeText={setNewRoomTitle}
                            maxLength={100}
                        />

                        <View style={styles.toggleRow}>
                            <View>
                                <Text style={styles.toggleTitle}>Audio-First Mode</Text>
                                <Text style={styles.toggleSubtitle}>Better for unstable networks</Text>
                            </View>
                            <Switch
                                value={isAudioOnly}
                                onValueChange={setIsAudioOnly}
                                trackColor={{ false: colors.border, true: colors.primary }}
                            />
                        </View>

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
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        ...typography.h2,
        color: colors.text,
    },
    headerSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: 4,
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
    fab: {
        position: 'absolute',
        right: spacing.lg,
        bottom: spacing.lg + 60,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
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
    },
    modalTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.lg,
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

