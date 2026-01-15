import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Image, Easing, ActivityIndicator, Alert, Share, Platform, Modal, KeyboardAvoidingView, FlatList, TextInput } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { IconSymbol } from './IconSymbol';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';
import { Reel, Comment } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/services/api';
import * as Haptics from 'expo-haptics';
import { typography } from '@/styles/commonStyles';

const { width, height } = Dimensions.get('window');

interface ReelItemProps {
    reel: Reel;
    isVisible: boolean;
    containerHeight?: number;
}

const CommentsModal = ({ isVisible, onClose, reelId, commentsCount, onCommentSuccess }: { isVisible: boolean, onClose: () => void, reelId: string, commentsCount: number, onCommentSuccess?: () => void }) => {
    const { isDark } = useThemeStore();
    const colors = isDark ? darkColors : lightColors;
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const loadComments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiClient.getComments(reelId);
            setComments(response.data || []);
        } catch (err) {
            console.error('Failed to load comments', err);
        } finally {
            setLoading(false);
        }
    }, [reelId]);

    useEffect(() => {
        if (isVisible) {
            loadComments();
        }
    }, [isVisible, loadComments]);

    const handleSubmit = async () => {
        if (!commentText.trim()) return;
        setSubmitting(true);
        try {
            await apiClient.commentOnPost(reelId, commentText); // Reels are posts
            setCommentText('');
            loadComments();
            if (onCommentSuccess) {
                onCommentSuccess();
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isVisible) return null;

    return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 100 }]}>  
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: height * 0.7 }}
            >
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ ...typography.h3, color: colors.text }}>Comments ({comments.length})</Text>
                    <TouchableOpacity onPress={onClose}>
                        <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
                ) : (
                    <FlatList
                        data={comments}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ fontWeight: 'bold', color: colors.text }}>{item.user.username}</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                                </View>
                                <Text style={{ color: colors.text, marginTop: 4 }}>{item.content}</Text>
                            </View>
                        )}
                        ListEmptyComponent={<Text style={{ padding: 20, textAlign: 'center', color: colors.textSecondary }}>No comments yet.</Text>}
                    />
                )}

                <View style={{ padding: 10, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'ios' ? 20 : 0 }}>
                    <TextInput
                        value={commentText}
                        onChangeText={setCommentText}
                        placeholder="Add a comment..."
                        placeholderTextColor={colors.textSecondary}
                        style={{ flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, color: colors.text, marginRight: 10 }}
                    />
                    <TouchableOpacity onPress={handleSubmit} disabled={submitting || !commentText.trim()}>
                        {submitting ? <ActivityIndicator color={colors.primary} /> : <IconSymbol ios_icon_name="arrow.up.circle.fill" android_material_icon_name="send" size={32} color={colors.primary} />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

export const ReelItem: React.FC<ReelItemProps> = ({ reel, isVisible, containerHeight }) => {
    const { isDark } = useThemeStore();
    const { user: currentUser } = useAuthStore();
    const colors = isDark ? darkColors : lightColors;
    const [isLiked, setIsLiked] = useState(reel.isLiked || false);
    const [likesCount, setLikesCount] = useState(reel.likesCount);
    const [commentsCount, setCommentsCount] = useState(reel.commentsCount || 0);
    const [isMuted, setIsMuted] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showComments, setShowComments] = useState(false);

    const isOwnReel = currentUser?.id === reel.userId;

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
            setIsBuffering(status === 'loading' || status === 'buffering');
            
            if (status === 'error') {
                console.error(`[ReelItem] Player Error (ID: ${reel.id}):`, payload);
                setError(payload?.error?.message || 'Playback error');
                setIsBuffering(false);
            }

            if (status === 'readyToPlay' || status === 'ready' || status === 'playing') {
                setIsReady(true);
                setError(null);
            }
        });

        return () => subscription.remove();
    }, [player, reel.id]);

    const heartScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isVisible) {
            player.play();
        } else {
            player.pause();
        }
    }, [isVisible, player]);

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
            setIsLiked(!newIsLiked);
            setLikesCount(prev => newIsLiked ? prev - 1 : prev + 1);
        }
    };

    const handleComment = () => {
        setShowComments(true);
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

    const toggleMute = () => {
        setIsMuted(!isMuted);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
        <View style={[styles.container, containerHeight ? { height: containerHeight } : { height: height }]}>
            <VideoView
                player={player}
                style={[styles.video, !isReady && { opacity: 0 }]}
                contentFit="cover"
                nativeControls={false}
            />

            {/* Gradient Overlay for modern look */}
            <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                style={styles.bottomGradient}
                pointerEvents="none"
            />

            {/* Top Gradient */}
            <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.2)', 'transparent']}
                style={styles.topGradient}
                pointerEvents="none"
            />

            {/* Thumbnail/Loading */}
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

            {/* Buffering */}
            {isBuffering && !error && (
                <View style={styles.centerContainer}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                    </View>
                </View>
            )}

            {/* Error */}
            {error && (
                <View style={styles.centerContainer}>
                    <View style={styles.errorContainer}>
                        <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="error-outline" size={40} color="#FFD60A" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={() => { setError(null); player.play(); }} style={styles.retryButton}>
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Heart Animation */}
            <Animated.View style={[styles.centerContainer, { transform: [{ scale: heartScale }] }]}>
                <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={100} color="#ff3b30" />
            </Animated.View>

            {/* Right Side Actions - Modern Design */}
            <View style={styles.rightActions}>
                {/* Avatar with gradient border */}
                <TouchableOpacity style={styles.avatarAction}>
                    <LinearGradient
                        colors={['#0a7ea4', '#EC4899']}
                        style={styles.avatarGradient}
                    >
                        <Image
                            source={{ uri: reel.user.avatar || 'https://via.placeholder.com/40' }}
                            style={styles.avatarImage}
                        />
                    </LinearGradient>
                    {!isOwnReel && (
                        <TouchableOpacity onPress={handleFollow} style={styles.followPlusButton}>
                            <LinearGradient colors={['#EC4899', '#F59E0B']} style={styles.followPlusGradient}>
                                <IconSymbol ios_icon_name={isFollowing ? "checkmark" : "plus"} android_material_icon_name={isFollowing ? "check" : "add"} size={14} color="#FFFFFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>

                {/* Like Button */}
                <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
                    <View style={styles.iconGlassContainer}>
                        <IconSymbol
                            ios_icon_name={isLiked ? "heart.fill" : "heart"}
                            android_material_icon_name={isLiked ? "favorite" : "favorite-border"}
                            size={28}
                            color={isLiked ? "#ff3b30" : "#FFFFFF"}
                        />
                    </View>
                    <Text style={styles.actionCount}>{likesCount > 1000 ? (likesCount / 1000).toFixed(1) + 'K' : likesCount}</Text>
                </TouchableOpacity>

                {/* Comment Button */}
                <TouchableOpacity onPress={handleComment} style={styles.actionButton}>
                    <View style={styles.iconGlassContainer}>
                        <IconSymbol
                            ios_icon_name="bubble.right.fill"
                            android_material_icon_name="chat-bubble"
                            size={28}
                            color="#FFFFFF"
                        />
                    </View>
                    <Text style={styles.actionCount}>{commentsCount}</Text>
                </TouchableOpacity>

                {/* Share Button */}
                <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                    <View style={styles.iconGlassContainer}>
                        <IconSymbol
                            ios_icon_name="paperplane.fill"
                            android_material_icon_name="send"
                            size={26}
                            color="#FFFFFF"
                        />
                    </View>
                    <Text style={styles.actionCount}>{reel.sharesCount || 0}</Text>
                </TouchableOpacity>

                {/* More Options */}
                <TouchableOpacity style={styles.actionButton}>
                    <View style={styles.iconGlassContainer}>
                        <IconSymbol
                            ios_icon_name="ellipsis"
                            android_material_icon_name="more-vert"
                            size={26}
                            color="#FFFFFF"
                        />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Bottom Info - Modern Design */}
            <View style={styles.bottomInfo}>
                <View style={styles.userInfoContainer}>
                    <View style={styles.userRow}>
                        <Text style={styles.username}>@{reel.user.username}</Text>
                        {reel.user.isVerified && (
                            <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={16} color="#1DA1F2" />
                        )}
                    </View>
                    
                    <Text style={styles.caption} numberOfLines={2}>
                        {reel.content}
                    </Text>

                    {/* Audio Info with modern styling */}
                    <View style={styles.audioTag}>
                        <IconSymbol ios_icon_name="music.note" android_material_icon_name="music-note" size={12} color="#FFFFFF" />
                        <Text style={styles.audioText} numberOfLines={1}>
                            Original Audio • {reel.user.username}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Mute Indicator */}
            {isMuted && (
                <View style={styles.muteIndicator}>
                    <View style={styles.muteIconContainer}>
                        <IconSymbol ios_icon_name="speaker.slash.fill" android_material_icon_name="volume-off" size={20} color="#FFFFFF" />
                    </View>
                </View>
            )}

            <CommentsModal 
                isVisible={showComments} 
                onClose={() => setShowComments(false)} 
                reelId={reel.id} 
                commentsCount={commentsCount}
                onCommentSuccess={() => setCommentsCount(prev => prev + 1)}
            />
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
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 350,
    },
    centerContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
    },
    loadingContainer: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 50,
        padding: 20,
    },
    errorContainer: {
        backgroundColor: 'rgba(0,0,0,0.75)',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        maxWidth: width * 0.8,
    },
    errorText: {
        color: '#FFFFFF',
        fontSize: 14,
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
    },
    retryText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '600',
    },
    rightActions: {
        position: 'absolute',
        right: 12,
        bottom: 140, // Moved up from 100 to avoid tab bar collision
        alignItems: 'center',
        gap: 18,
        zIndex: 10,
    },
    avatarAction: {
        alignItems: 'center',
        marginBottom: 4,
    },
    avatarGradient: {
        width: 52,
        height: 52,
        borderRadius: 26,
        padding: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#000',
    },
    followPlusButton: {
        position: 'absolute',
        bottom: -6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    followPlusGradient: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButton: {
        alignItems: 'center',
        gap: 4,
    },
    iconGlassContainer: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 28,
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    actionCount: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    bottomInfo: {
        position: 'absolute',
        left: 16,
        right: 80,
        bottom: 40,
        zIndex: 10,
    },
    userInfoContainer: {
        gap: 8,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    username: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    caption: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 20,
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    audioTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    audioText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    muteIndicator: {
        position: 'absolute',
        top: 60,
        right: 16,
        zIndex: 20,
    },
    muteIconContainer: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 24,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    // Legacy styles (kept for backward compatibility)
    animationContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        paddingHorizontal: 15,
        paddingBottom: 40,
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
