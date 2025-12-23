import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import { Story } from '@/types';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds for images

export default function StoriesScreen() {
    const router = useRouter();
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const insets = useSafeAreaInsets();
    const [stories, setStories] = useState<Story[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const videoRef = useRef<Video>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        loadStories();
    }, [userId]);

    const loadStories = async () => {
        try {
            const response = await apiClient.getStories(userId);
            setStories(response.data || []);
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to load stories:', error);
            setIsLoading(false);
        }
    };

    // Get current story safely
    const currentStory = stories.length > 0 ? stories[currentIndex] : null;

    // Mark as viewed when story changes
    useEffect(() => {
        if (currentStory && !currentStory.isViewed) {
            apiClient.markStoryAsViewed(currentStory.id).catch(err =>
                console.error('Failed to mark story as viewed:', err)
            );
        }
    }, [currentStory]);

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        } else {
            handleClose();
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
        } else {
            setProgress(0);
        }
    };

    const handleClose = () => {
        router.back();
    };

    // Auto-advance logic
    useEffect(() => {
        if (!currentStory || isPaused) return;

        let interval: ReturnType<typeof setInterval>;

        // Only auto-advance for image/text stories
        if (currentStory.type === 'video') {
            return;
        }

        const startTime = Date.now();
        interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = elapsed / STORY_DURATION;

            if (newProgress >= 1) {
                handleNext();
            } else {
                setProgress(newProgress);
            }
        }, 50);

        return () => clearInterval(interval);
    }, [currentIndex, currentStory, isPaused]);

    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;

        if (status.didJustFinish) {
            handleNext();
        } else {
            setProgress(status.positionMillis / (status.durationMillis || 1));
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    }

    if (stories.length === 0 || !currentStory) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.content}>
                    <Text style={styles.placeholder}>No stories found</Text>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: false,
                    presentation: 'fullScreenModal',
                    animation: 'fade',
                }}
            />

            {/* Media Content */}
            {currentStory.type === 'image' && currentStory.mediaUrl && (
                <Image
                    source={{ uri: currentStory.mediaUrl }}
                    style={styles.media}
                    contentFit="cover"
                />
            )}

            {currentStory.type === 'video' && currentStory.mediaUrl && (
                <Video
                    ref={videoRef}
                    source={{ uri: currentStory.mediaUrl }}
                    style={styles.media}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={!isPaused}
                    isLooping={false}
                    onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                />
            )}

            {currentStory.type === 'text' && (
                <View style={[styles.media, styles.textStory, { backgroundColor: currentStory.backgroundColor || '#000000' }]}>
                    <Text style={styles.textContent}>{currentStory.content}</Text>
                </View>
            )}

            {/* Overlay Gradient */}
            <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.4)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />

            {/* Progress Bars and Header */}
            <View style={[styles.overlayContainer, { paddingTop: insets.top }]}>
                <View style={styles.progressContainer}>
                    {stories.map((story, index) => (
                        <View key={story.id} style={styles.progressBarBackground}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: index === currentIndex
                                            ? `${progress * 100}%`
                                            : index < currentIndex ? '100%' : '0%'
                                    }
                                ]}
                            />
                        </View>
                    ))}
                </View>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.userInfo}>
                        <Image
                            source={{ uri: currentStory.user?.avatar || 'https://via.placeholder.com/40' }}
                            style={styles.avatar}
                        />
                        <Text style={styles.username}>{currentStory.user?.username || 'User'}</Text>
                        <Text style={styles.timestamp}>
                            {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                        <IconSymbol
                            ios_icon_name="xmark"
                            android_material_icon_name="close"
                            size={28}
                            color="#FFFFFF"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Touch Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={styles.touchLeft}
                    onPress={handlePrevious}
                    onLongPress={() => setIsPaused(true)}
                    onPressOut={() => setIsPaused(false)}
                    activeOpacity={1}
                />
                <TouchableOpacity
                    style={styles.touchRight}
                    onPress={handleNext}
                    onLongPress={() => setIsPaused(true)}
                    onPressOut={() => setIsPaused(false)}
                    activeOpacity={1}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: {
        width: width,
        height: height,
        position: 'absolute',
    },
    textStory: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    textContent: {
        ...typography.h1,
        color: '#FFFFFF',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholder: {
        ...typography.body,
        color: '#FFFFFF',
        marginBottom: spacing.lg,
    },
    closeButton: {
        padding: spacing.md,
    },
    closeButtonText: {
        color: colors.primary,
        fontWeight: '600',
    },
    overlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    progressContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.sm,
        paddingTop: spacing.sm,
        gap: 4,
    },
    progressBarBackground: {
        flex: 1,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    username: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    timestamp: {
        ...typography.caption,
        color: 'rgba(255,255,255,0.7)',
    },
    controls: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        zIndex: 5,
    },
    touchLeft: {
        flex: 1,
    },
    touchRight: {
        flex: 1,
    },
});
