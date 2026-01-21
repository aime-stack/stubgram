import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, FlatList, ViewToken, Modal } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, borderRadius, spacing } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useStoryStore, StoryGroup } from '@/stores/storyStore';
import { Story, User } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/services/api';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000;

interface StoryUserViewProps {
    group: StoryGroup;
    isActive: boolean;
    onNextUser: () => void;
    onPrevUser: () => void;
    onClose: () => void;
}

const StoryUserView = React.memo(({ group, isActive, onNextUser, onPrevUser, onClose }: StoryUserViewProps) => {
    const { markAsViewed } = useStoryStore();
    const { user } = useAuthStore();
    const isOwner = user?.id === group.user.id;
    const insets = useSafeAreaInsets();
    
    const initialStoryIndex = Math.max(0, group.stories.findIndex(s => !s.isViewed));
    const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);

    // Viewers Modal State
    const [showViewers, setShowViewers] = useState(false);
    const [viewers, setViewers] = useState<(User & { viewedAt: string })[]>([]);
    const [isLoadingViewers, setIsLoadingViewers] = useState(false);

    const stories = group.stories;
    const currentStory = stories[currentIndex];

    // Video Player Setup
    const player = useVideoPlayer(currentStory?.type === 'video' && isActive ? (currentStory.mediaUrl || '') : '', (player) => {
        player.loop = false;
        if (isActive && !isPaused && !showViewers) {
            player.play();
        } else {
            player.pause();
        }
    });

    // Reset state when user changes or active state changes
    useEffect(() => {
        if (!isActive || showViewers) {
            setIsPaused(true);
            try { player.pause(); } catch(e) {}
        } else {
            setIsPaused(false);
            try { player.play(); } catch(e) {}
        }
    }, [isActive, player, showViewers]);

    // Mark as viewed
    useEffect(() => {
        if (isActive && currentStory && !currentStory.isViewed) {
             markAsViewed(currentStory.id);
        }
    }, [currentIndex, isActive, currentStory]);

    const handleNext = useCallback(() => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        } else {
            onNextUser();
        }
    }, [currentIndex, stories.length, onNextUser]);

    const handlePrevious = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
        } else {
            onPrevUser();
        }
    }, [currentIndex, onPrevUser]);

    // Auto-advance Timer
    useEffect(() => {
        if (!isActive || isPaused || !currentStory || showViewers) return;

        let interval: ReturnType<typeof setInterval>;

        if (currentStory.type === 'video') {
             interval = setInterval(() => {
                 if (player.duration > 0) {
                     setVideoDuration(player.duration);
                     setProgress(player.currentTime / player.duration);
                 }
             }, 50);
             // Safety fallback if video stalls
             if (player.currentTime >= player.duration - 0.1 && player.duration > 0) {
                 handleNext();
             }
        } else {
            const startTime = Date.now() - (progress * STORY_DURATION);
            interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const newProgress = elapsed / STORY_DURATION;
                if (newProgress >= 1) {
                    handleNext();
                } else {
                    setProgress(newProgress);
                }
            }, 50);
        }
        return () => clearInterval(interval);
    }, [isActive, isPaused, currentStory, player, handleNext, showViewers]);

    // Video Events
    useEffect(() => {
        if (!player) return;
        const sub = player.addListener('playToEnd', handleNext);
        return () => sub.remove();
    }, [player, handleNext]);


    const fetchViewers = async () => {
        if (!currentStory) return;
        setIsLoadingViewers(true);
        try {
            const response = await apiClient.getStoryViewers(currentStory.id);
            setViewers(response.data);
        } catch (error) {
            console.error('Failed to fetch viewers:', error);
        } finally {
            setIsLoadingViewers(false);
        }
    };

    const handleOpenViewers = () => {
        setIsPaused(true);
        setShowViewers(true);
        fetchViewers();
    };

    const handleCloseViewers = () => {
        setShowViewers(false);
        setIsPaused(false);
    };

    if (!currentStory) return null;

    return (
        <View style={styles.userStoryContainer}>
            {/* Media Rendering */}
            {currentStory.type === 'image' && currentStory.mediaUrl && (
                <Image source={{ uri: currentStory.mediaUrl }} style={styles.media} contentFit="cover" />
            )}
            {currentStory.type === 'video' && (
                <VideoView player={player} style={styles.media} contentFit="cover" nativeControls={false} />
            )}
            {currentStory.type === 'text' && (
                <View style={[styles.media, styles.textStory, { backgroundColor: currentStory.backgroundColor || '#000000' }]}>
                    <Text style={styles.textContent}>{currentStory.content}</Text>
                </View>
            )}

             <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.4)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

            {/* UI Overlay */}
            <View style={[styles.overlayContainer, { paddingTop: insets.top }]}>
                {/* Progress Bars */}
                <View style={styles.progressContainer}>
                    {stories.map((story, index) => (
                        <View key={story.id} style={styles.progressBarBackground}>
                             <View style={[styles.progressBarFill, { width: index === currentIndex ? `${Math.min(progress * 100, 100)}%` : index < currentIndex ? '100%' : '0%' }]} />
                        </View>
                    ))}
                </View>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.userInfo}>
                        <Image source={{ uri: group.user.avatar || 'https://via.placeholder.com/40' }} style={styles.avatar} />
                        <Text style={styles.username}>{group.user.username}</Text>
                        <Text style={styles.timestamp}>{new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                         <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tap Zones */}
            <View style={styles.controls}>
                <TouchableOpacity style={styles.touchLeft} onPress={handlePrevious} onLongPress={() => setIsPaused(true)} onPressOut={() => setIsPaused(false)} activeOpacity={1} />
                <TouchableOpacity style={styles.touchRight} onPress={handleNext} onLongPress={() => setIsPaused(true)} onPressOut={() => setIsPaused(false)} activeOpacity={1} />
            </View>

            {/* Viewers Trigger (Owner Only) */}
            {isOwner && (
                <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                    <TouchableOpacity style={styles.viewersButton} onPress={handleOpenViewers}>
                        <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={20} color="#FFFFFF" />
                        <Text style={styles.viewersText}>{currentStory.viewsCount || 0} Views</Text>
                        <IconSymbol ios_icon_name="chevron.up" android_material_icon_name="keyboard-arrow-up" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Viewers Modal */}
            <Modal visible={showViewers} animationType="slide" onRequestClose={handleCloseViewers}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Story Views</Text>
                        <TouchableOpacity onPress={handleCloseViewers} style={styles.modalCloseButton}>
                             <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={30} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    
                    {isLoadingViewers ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={viewers}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: spacing.md }}
                            ListEmptyComponent={<Text style={styles.emptyText}>No views yet.</Text>}
                            renderItem={({ item }) => (
                                <View style={styles.viewerItem}>
                                    <Image source={{ uri: item.avatar || 'https://via.placeholder.com/40' }} style={styles.viewerAvatar} />
                                    <View style={styles.viewerInfo}>
                                        <Text style={styles.viewerName}>{item.username}</Text>
                                        <Text style={styles.viewedTime}>{new Date(item.viewedAt).toLocaleTimeString()}</Text>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
});

export default function StoriesScreen() {
    const router = useRouter();
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const { storyGroups, fetchStories, isLoading } = useStoryStore();
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const hasMounted = useRef(false);

    useEffect(() => {
        if (!storyGroups.length) {
            fetchStories();
        }
    }, []);

    // Scroll to initial user
    useEffect(() => {
        if (storyGroups.length > 0 && !hasMounted.current) {
            const index = storyGroups.findIndex(g => g.user.id === userId);
            if (index !== -1) {
                setActiveIndex(index);
                // setTimeout to allow FlatList to layout
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index, animated: false });
                }, 100);
            }
            hasMounted.current = true;
        }
    }, [storyGroups, userId]);

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index || 0);
        }
    }, []);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50
    }).current;

    const handleClose = () => router.back();

    const handleNextUser = () => {
        if (activeIndex < storyGroups.length - 1) {
            flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
        } else {
            handleClose();
        }
    };

    const handlePrevUser = () => {
        if (activeIndex > 0) {
            flatListRef.current?.scrollToIndex({ index: activeIndex - 1, animated: true });
        }
    };

    if (isLoading && storyGroups.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    }

    if (storyGroups.length === 0) {
         return (
            <View style={styles.loadingContainer}>
                <Text style={{color: 'white'}}>No stories available.</Text>
                <TouchableOpacity onPress={handleClose} style={{marginTop: 20}}>
                     <Text style={{color: colors.primary}}>Close</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            <FlatList
                ref={flatListRef}
                data={storyGroups}
                keyExtractor={(item) => item.user.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                initialNumToRender={1}
                maxToRenderPerBatch={2}
                windowSize={3}
                renderItem={({ item, index }) => (
                    <View style={{ width, height }}>
                        <StoryUserView
                            group={item}
                            isActive={index === activeIndex}
                            onNextUser={handleNextUser}
                            onPrevUser={handlePrevUser}
                            onClose={handleClose}
                        />
                    </View>
                )}
                getItemLayout={(_, index) => ({
                    length: width,
                    offset: width * index,
                    index,
                })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    loadingContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
    userStoryContainer: { width: width, height: height, backgroundColor: 'black' },
    media: { width: width, height: height, position: 'absolute' },
    textStory: { justifyContent: 'center', alignItems: 'center', padding: 32 },
    textContent: { ...typography.h1, color: '#FFFFFF', textAlign: 'center' },
    overlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    progressContainer: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8, gap: 4 },
    progressBarBackground: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#FFFFFF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF' },
    username: { ...typography.body, color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    timestamp: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },
    closeButton: { padding: 8 },
    controls: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 5 },
    touchLeft: { flex: 1 },
    touchRight: { flex: 2 },
    footer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', zIndex: 20 },
    viewersButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 8 },
    viewersText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    modalContainer: { flex: 1, backgroundColor: colors.background, marginTop: 100, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { ...typography.h3, color: colors.text },
    modalCloseButton: { padding: 4 },
    viewerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border },
    viewerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    viewerInfo: { flex: 1 },
    viewerName: { ...typography.body, fontWeight: '600', color: colors.text },
    viewedTime: { ...typography.caption, color: colors.textSecondary },
    emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 20 }
});
