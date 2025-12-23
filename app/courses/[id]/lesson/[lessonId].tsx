
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Dimensions,
    Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LessonData {
    id: string;
    title: string;
    description?: string;
    contentType: 'video' | 'text' | 'pdf';
    videoUrl?: string;
    textContent?: string;
    pdfUrl?: string;
    durationMinutes?: number;
    orderIndex: number;
}

export default function LessonScreen() {
    const router = useRouter();
    const { id: courseId, lessonId } = useLocalSearchParams<{ id: string; lessonId: string }>();
    const [lesson, setLesson] = useState<LessonData | null>(null);
    const [allLessons, setAllLessons] = useState<LessonData[]>([]);
    const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCompleted, setIsCompleted] = useState(false);

    const loadLesson = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.getCourse(courseId);
            const courseData = response.data;

            setAllLessons(courseData.lessons);
            setEnrollmentId(courseData.enrollment?.id || null);

            const currentLesson = courseData.lessons.find((l: any) => l.id === lessonId);
            if (currentLesson) {
                setLesson(currentLesson);
                setIsCompleted(currentLesson.progress >= 100);
            }
        } catch (error) {
            console.error('Failed to load lesson:', error);
        } finally {
            setIsLoading(false);
        }
    }, [courseId, lessonId]);

    useEffect(() => {
        loadLesson();
    }, [loadLesson]);

    const handleMarkComplete = async () => {
        if (!enrollmentId || !lessonId) return;

        try {
            await apiClient.updateLessonProgress(enrollmentId, lessonId, 100);
            setIsCompleted(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Navigate to next lesson if available
            const currentIndex = allLessons.findIndex(l => l.id === lessonId);
            if (currentIndex < allLessons.length - 1) {
                const nextLesson = allLessons[currentIndex + 1];
                setTimeout(() => {
                    router.replace(`/courses/${courseId}/lesson/${nextLesson.id}`);
                }, 500);
            }
        } catch (error) {
            console.error('Failed to update progress:', error);
        }
    };

    const navigateToLesson = (direction: 'prev' | 'next') => {
        const currentIndex = allLessons.findIndex(l => l.id === lessonId);
        const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

        if (newIndex >= 0 && newIndex < allLessons.length) {
            router.replace(`/courses/${courseId}/lesson/${allLessons[newIndex].id}`);
        }
    };

    const getYouTubeEmbedUrl = (url: string) => {
        // Convert YouTube URLs to embed format
        // Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
        let videoId = '';

        if (url.includes('youtube.com/watch')) {
            const urlParams = new URL(url).searchParams;
            videoId = urlParams.get('v') || '';
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('youtube.com/embed/')[1]?.split('?')[0] || '';
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
        }

        return url;
    };

    const openPdf = (url: string) => {
        Linking.openURL(url);
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!lesson) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Lesson not found</Text>
            </View>
        );
    }

    const currentIndex = allLessons.findIndex(l => l.id === lessonId);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < allLessons.length - 1;

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: lesson.title,
                    headerShown: true,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerBackTitle: 'Course',
                }}
            />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Video Content */}
                {lesson.contentType === 'video' && lesson.videoUrl && (
                    <View style={styles.videoContainer}>
                        <WebView
                            style={styles.video}
                            source={{ uri: getYouTubeEmbedUrl(lesson.videoUrl) }}
                            allowsFullscreenVideo
                            allowsInlineMediaPlayback
                            mediaPlaybackRequiresUserAction={false}
                            javaScriptEnabled
                        />
                    </View>
                )}

                {/* Text Content */}
                {lesson.contentType === 'text' && lesson.textContent && (
                    <View style={styles.textContainer}>
                        <Markdown
                            style={{
                                body: { ...typography.body, color: colors.text },
                                heading1: { ...typography.h1, color: colors.text, marginVertical: spacing.md },
                                heading2: { ...typography.h2, color: colors.text, marginVertical: spacing.md },
                                heading3: { ...typography.h3, color: colors.text, marginVertical: spacing.sm },
                                paragraph: { marginBottom: spacing.md, lineHeight: 24 },
                                code_inline: {
                                    backgroundColor: colors.card,
                                    color: colors.primary,
                                    paddingHorizontal: spacing.xs,
                                    borderRadius: 4,
                                },
                                code_block: {
                                    backgroundColor: colors.card,
                                    padding: spacing.md,
                                    borderRadius: borderRadius.md,
                                    marginVertical: spacing.md,
                                },
                                link: { color: colors.primary },
                                bullet_list: { marginVertical: spacing.sm },
                                ordered_list: { marginVertical: spacing.sm },
                            }}
                        >
                            {lesson.textContent}
                        </Markdown>
                    </View>
                )}

                {/* PDF Content */}
                {lesson.contentType === 'pdf' && lesson.pdfUrl && (
                    <View style={styles.pdfContainer}>
                        <IconSymbol
                            ios_icon_name="doc.fill"
                            android_material_icon_name="picture-as-pdf"
                            size={64}
                            color={colors.primary}
                        />
                        <Text style={styles.pdfTitle}>PDF Document</Text>
                        <Text style={styles.pdfSubtext}>Tap below to view the PDF</Text>
                        <TouchableOpacity
                            style={styles.pdfButton}
                            onPress={() => openPdf(lesson.pdfUrl!)}
                        >
                            <Text style={styles.pdfButtonText}>Open PDF</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Lesson Description */}
                {lesson.description && (
                    <View style={styles.descriptionSection}>
                        <Text style={styles.descriptionTitle}>About this lesson</Text>
                        <Text style={styles.descriptionText}>{lesson.description}</Text>
                    </View>
                )}

                {/* Spacer */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.navButton, !hasPrev && styles.navButtonDisabled]}
                    onPress={() => navigateToLesson('prev')}
                    disabled={!hasPrev}
                >
                    <IconSymbol
                        ios_icon_name="chevron.left"
                        android_material_icon_name="chevron-left"
                        size={24}
                        color={hasPrev ? colors.text : colors.textSecondary}
                    />
                </TouchableOpacity>

                {isCompleted ? (
                    <View style={styles.completedBadge}>
                        <IconSymbol
                            ios_icon_name="checkmark.circle.fill"
                            android_material_icon_name="check-circle"
                            size={20}
                            color={colors.highlight}
                        />
                        <Text style={styles.completedText}>Completed</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.completeButton}
                        onPress={handleMarkComplete}
                    >
                        <Text style={styles.completeButtonText}>Mark as Complete</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
                    onPress={() => navigateToLesson('next')}
                    disabled={!hasNext}
                >
                    <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={24}
                        color={hasNext ? colors.text : colors.textSecondary}
                    />
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    errorText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    content: {
        flex: 1,
    },
    videoContainer: {
        width: SCREEN_WIDTH,
        height: (SCREEN_WIDTH * 9) / 16, // 16:9 aspect ratio
        backgroundColor: '#000',
    },
    video: {
        flex: 1,
    },
    textContainer: {
        padding: spacing.md,
    },
    pdfContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxl,
        backgroundColor: colors.card,
        margin: spacing.md,
        borderRadius: borderRadius.lg,
    },
    pdfTitle: {
        ...typography.h3,
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    pdfSubtext: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    pdfButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
    },
    pdfButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    descriptionSection: {
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        marginTop: spacing.md,
    },
    descriptionTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    descriptionText: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    navButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navButtonDisabled: {
        opacity: 0.5,
    },
    completeButton: {
        flex: 1,
        marginHorizontal: spacing.md,
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    completeButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    completedBadge: {
        flex: 1,
        flexDirection: 'row',
        marginHorizontal: spacing.md,
        backgroundColor: colors.card,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.highlight,
    },
    completedText: {
        ...typography.body,
        color: colors.highlight,
        fontWeight: '600',
    },
});
