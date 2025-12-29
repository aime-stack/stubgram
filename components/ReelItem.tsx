import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Image, Easing, ActivityIndicator, Alert, Share, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { IconSymbol } from './IconSymbol';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';
import { Reel } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/services/api';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface ReelItemProps {
    reel: Reel;
    isVisible: boolean;
    containerHeight?: number;
}

export const ReelItem: React.FC<ReelItemProps> = ({ reel, isVisible, containerHeight }) => {
    const { isDark } = useThemeStore();
    const { user: currentUser } = useAuthStore();
    const colors = isDark ? darkColors : lightColors;
    const [isLiked, setIsLiked] = useState(reel.isLiked || false);
    const [likesCount, setLikesCount] = useState(reel.likesCount);
    const [isMuted, setIsMuted] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isOwnReel = currentUser?.id === reel.userId;

    // Debug Log for Black Screen
    useEffect(() => {
        if (isVisible) {
            console.log(`[ReelItem] Playing ${reel.id}: ${reel.processing_status} | URL: ${reel.videoUrl}`);
        }
    }, [isVisible, reel]);

    const player = useVideoPlayer(reel.videoUrl, (player) => {
        player.loop = true;
        player.muted = isMuted;
        if (isVisible) {
            player.play();
        }
    });

    useEffect(() => {
        const subscription = player.addListener('statusChange', (payload: any) => {
            const status = payload?.status || payload;
            console.log(`[ReelItem] Status Change (ID: ${reel.id}):`, status, payload);
            
            setIsBuffering(status === 'loading' || status === 'buffering');
            
            if (status === 'error') {
                console.error(`[ReelItem] Player Error Status (ID: ${reel.id}):`, payload);
                setError(payload?.error?.message || 'Playback error');
                setIsBuffering(false);
            }

            if (status === 'readyToPlay' || status === 'ready' || status === 'playing') {
                setIsReady(true);
                setError(null);
            }
        });
        
        console.log(`[ReelItem] Player Initialized (ID: ${reel.id}) URL:`, reel.videoUrl);

        return () => {
            subscription.remove();
        };
    }, [player, reel.id]);

    const heartScale = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isVisible) {
            player.play();
            // Start rotating record animation
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            player.pause();
            rotateAnim.setValue(0);
        }
    }, [isVisible, player]);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    useEffect(() => {
        player.muted = isMuted;
    }, [isMuted, player]);

    const handleLike = async () => {
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);

        if (newIsLiked) {
            Animated.sequence([
                Animated.spring(heartScale, { toValue: 1.5, friction: 3, tension: 40, useNativeDriver: true }),
                Animated.spring(heartScale, { toValue: 0, friction: 5, tension: 40, useNativeDriver: true }),
            ]).start();
        }

        try {
            await apiClient.likeReel(reel.id);
        } catch (error) {
            console.error('Like failed:', error);
            // Revert on failure
            setIsLiked(!newIsLiked);
            setLikesCount(prev => newIsLiked ? prev - 1 : prev + 1);
        }
    };

    const handleComment = () => {
        Alert.alert('Comments', 'Opening comments for Reel ' + reel.id);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${reel.content || ''}\n\nWatch this on StubGram: https://stubgram.app/reel/${reel.id}`,
            });
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleFollow = () => {
        setIsFollowing(!isFollowing);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    const toggleMute = () => {
        setIsMuted(!isMuted);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const toggleSpeed = () => {
        const nextSpeed = playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 0.5 : 1;
        setPlaybackSpeed(nextSpeed);
        player.playbackSpeed = nextSpeed;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    useEffect(() => {
        player.playbackSpeed = playbackSpeed;
    }, [playbackSpeed, player]);

    return (
        <View style={[styles.container, containerHeight ? { height: containerHeight } : { height: height - 60 }]}>
            <VideoView
                player={player}
                style={[styles.video, !isReady && { opacity: 0 }]}
                contentFit="cover"
                nativeControls={false}
            />

            {!isReady && (
                <Image
                    source={{ uri: reel.thumbnailUrl || reel.videoUrl.replace('.mp4', '.jpg') }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    blurRadius={Platform.OS === 'ios' ? 10 : 5}
                />
            )}

            <TouchableOpacity
                activeOpacity={1}
                onPress={toggleMute}
                style={styles.touchOverlay}
            />

            {/* Buffering Indicator (Only if Ready) */}
            {isBuffering && !error && (
                <View style={styles.animationContainer}>
                    <ActivityIndicator size="large" color="#FFF" />
                </View>
            )}

            {/* Error Message */}
            {error && (
                <View style={[styles.animationContainer, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="error-outline" size={48} color="#FFD60A" />
                    <Text style={[styles.actionText, { marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }]}>
                        {error}
                    </Text>
                    <TouchableOpacity 
                        onPress={() => { setError(null); player.play(); }}
                        style={[styles.followButton, { marginTop: 20 }]}
                    >
                        <Text style={styles.followText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Heart Animation on Like */}
            <Animated.View style={[styles.animationContainer, { transform: [{ scale: heartScale }] }]}>
                <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={100} color="#ff3b30" />
            </Animated.View>

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
                style={styles.bottomGradient}
            />

            {/* Overlays */}
            <View style={styles.overlayContainer}>
                {/* Right Side Actions */}
                <View style={styles.rightActions}>
                    <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
                        <IconSymbol
                            ios_icon_name={isLiked ? "heart.fill" : "heart"}
                            android_material_icon_name={isLiked ? "favorite" : "favorite-border"}
                            size={34}
                            color={isLiked ? "#ff3b30" : "#ffffff"}
                        />
                        <Text style={styles.actionText}>{likesCount > 1000 ? (likesCount / 1000).toFixed(1) + 'K' : likesCount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleComment} style={styles.actionButton}>
                        <IconSymbol
                            ios_icon_name="bubble.right.fill"
                            android_material_icon_name="chat-bubble"
                            size={32}
                            color="#ffffff"
                        />
                        <Text style={styles.actionText}>{reel.commentsCount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                        <IconSymbol
                            ios_icon_name="paperplane.fill"
                            android_material_icon_name="send"
                            size={30}
                            color="#ffffff"
                        />
                        <Text style={styles.actionText}>{reel.sharesCount || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={toggleSpeed} style={styles.actionButton}>
                        <View style={styles.speedIcon}>
                            <Text style={styles.speedText}>{playbackSpeed}x</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                        <IconSymbol
                            ios_icon_name="ellipsis"
                            android_material_icon_name="more-vert"
                            size={30}
                            color="#ffffff"
                        />
                    </TouchableOpacity>

                    {/* Rotating Record Icon */}
                    <Animated.View style={[styles.recordContainer, { transform: [{ rotate }] }]}>
                        <Image
                            source={{ uri: reel.user.avatar || 'https://via.placeholder.com/40' }}
                            style={styles.recordImage}
                        />
                    </Animated.View>
                </View>

                {/* Bottom Info */}
                <View style={styles.bottomInfo}>
                    <View style={styles.userInfo}>
                        <TouchableOpacity 
                            style={styles.avatarContainer}
                            onPress={() => Alert.alert('Profile', 'Navigate to ' + reel.user.username)}
                        >
                            <Image
                                source={{ uri: reel.user.avatar || 'https://via.placeholder.com/40' }}
                                style={styles.avatar}
                            />
                        </TouchableOpacity>
                        <Text style={styles.username}>{reel.user.username}</Text>
                        
                        {!isOwnReel && (
                            <TouchableOpacity onPress={handleFollow} style={[styles.followButton, isFollowing && styles.followingButton]}>
                                <Text style={styles.followText}>{isFollowing ? 'Following' : 'Follow'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity activeOpacity={0.8}>
                        <Text style={styles.caption} numberOfLines={2}>
                            {reel.content}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.audioInfo}>
                        <IconSymbol ios_icon_name="music.note" android_material_icon_name="music-note" size={14} color="#ffffff" />
                        <View style={styles.audioTextContainer}>
                            <Text style={styles.audioText} numberOfLines={1}>Original Audio • {reel.user.username} • Inspired by SnapGram</Text>
                        </View>
                    </View>
                </View>
            </View>

            {isMuted && (
                <View style={styles.muteIndicator}>
                    <IconSymbol ios_icon_name="speaker.slash.fill" android_material_icon_name="volume-off" size={24} color="#ffffff" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width,
        backgroundColor: '#000',
    },
    video: {
        ...StyleSheet.absoluteFillObject,
    },
    touchOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    animationContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 350,
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        paddingHorizontal: 15,
        paddingBottom: 40,
    },
    rightActions: {
        position: 'absolute',
        right: 15,
        bottom: 120,
        alignItems: 'center',
        gap: 20,
    },
    actionButton: {
        alignItems: 'center',
    },
    actionText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    bottomInfo: {
        width: width * 0.75,
        gap: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatarContainer: {
        marginRight: 4,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#ffffff',
    },
    username: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    followButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffffff',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    followingButton: {
        backgroundColor: 'transparent',
        borderColor: 'rgba(255,255,255,0.5)',
    },
    followText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    },
    caption: {
        color: '#ffffff',
        fontSize: 14,
        lineHeight: 18,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        marginTop: 4,
    },
    audioInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    audioTextContainer: {
        maxWidth: width * 0.5,
    },
    audioText: {
        color: '#ffffff',
        fontSize: 13,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    recordContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#333',
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    recordImage: {
        width: 26,
        height: 26,
        borderRadius: 13,
    },
    muteIndicator: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -20 }, { translateY: -20 }],
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 30,
        zIndex: 20,
    },
    speedIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
        borderColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    speedText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
