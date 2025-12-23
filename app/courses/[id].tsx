
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import { useWalletStore } from '@/stores/walletStore';
import * as Haptics from 'expo-haptics';

interface Lesson {
    id: string;
    title: string;
    description?: string;
    contentType: 'video' | 'text' | 'pdf';
    videoUrl?: string;
    durationMinutes?: number;
    orderIndex: number;
    isPreview: boolean;
    progress: number;
}

interface CourseDetails {
    id: string;
    title: string;
    description?: string;
    teacher: any;
    price: number;
    thumbnail?: string;
    duration: string;
    studentsCount: number;
    rating: number;
    isEnrolled: boolean;
    enrollment?: {
        id: string;
        progress: number;
        lastLessonId?: string;
        createdAt?: string;
    } | null;
    lessons: Lesson[];
}

export default function CourseDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { balance } = useWalletStore();
    const [course, setCourse] = useState<CourseDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);

    const loadCourse = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.getCourse(id);
            setCourse(response.data);
        } catch (error) {
            console.error('Failed to load course:', error);
            Alert.alert('Error', 'Failed to load course details');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadCourse();
    }, [loadCourse]);

    const handleEnroll = async () => {
        if (!course) return;

        if (balance < course.price) {
            Alert.alert(
                'Insufficient Coins',
                `You need ${course.price} coins but only have ${balance}. Would you like to get more coins?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Get Coins', onPress: () => router.push('/wallet') },
                ]
            );
            return;
        }

        Alert.alert(
            'Confirm Enrollment',
            `Enroll in "${course.title}" for ${course.price} 🪙?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Enroll',
                    onPress: async () => {
                        setIsEnrolling(true);
                        try {
                            await apiClient.enrollInCourse(course.id);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert('Success', 'You are now enrolled in this course!');
                            loadCourse(); // Reload to get enrollment status
                        } catch (error: any) {
                            console.error('Enrollment failed:', error);
                            Alert.alert('Error', error.message || 'Failed to enroll');
                        } finally {
                            setIsEnrolling(false);
                        }
                    },
                },
            ]
        );
    };

    const handleLessonPress = (lesson: Lesson) => {
        if (!course?.isEnrolled && !lesson.isPreview) {
            Alert.alert('Enrollment Required', 'Please enroll to access this lesson');
            return;
        }

        router.push(`/courses/${id}/lesson/${lesson.id}`);
    };

    const getContentTypeIcon = (type: string) => {
        switch (type) {
            case 'video':
                return { ios: 'play.circle.fill', android: 'play-circle-filled' };
            case 'text':
                return { ios: 'doc.text.fill', android: 'description' };
            case 'pdf':
                return { ios: 'doc.fill', android: 'picture-as-pdf' };
            default:
                return { ios: 'circle.fill', android: 'circle' };
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!course) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Course not found</Text>
            </View>
        );
    }

    const completedLessons = course.lessons.filter(l => l.progress >= 100).length;
    const progressPercent = course.lessons.length > 0
        ? Math.round((completedLessons / course.lessons.length) * 100)
        : 0;

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Hero Image */}
                <View style={styles.heroContainer}>
                    <Image
                        source={{ uri: course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800' }}
                        style={styles.heroImage}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.heroGradient}
                    />
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <IconSymbol
                            ios_icon_name="chevron.left"
                            android_material_icon_name="arrow-back"
                            size={24}
                            color="#FFFFFF"
                        />
                    </TouchableOpacity>
                    <View style={styles.heroContent}>
                        <Text style={styles.heroTitle}>{course.title}</Text>
                        <View style={styles.heroStats}>
                            <View style={styles.stat}>
                                <IconSymbol
                                    ios_icon_name="person.2.fill"
                                    android_material_icon_name="people"
                                    size={16}
                                    color="#FFFFFF"
                                />
                                <Text style={styles.statText}>{course.studentsCount} students</Text>
                            </View>
                            <View style={styles.stat}>
                                <IconSymbol
                                    ios_icon_name="star.fill"
                                    android_material_icon_name="star"
                                    size={16}
                                    color={colors.accent}
                                />
                                <Text style={styles.statText}>{course.rating.toFixed(1)}</Text>
                            </View>
                            <View style={styles.stat}>
                                <IconSymbol
                                    ios_icon_name="clock.fill"
                                    android_material_icon_name="schedule"
                                    size={16}
                                    color="#FFFFFF"
                                />
                                <Text style={styles.statText}>{course.duration}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Teacher Card */}
                <TouchableOpacity
                    style={styles.teacherCard}
                    onPress={() => router.push(`/user/${course.teacher.id}`)}
                >
                    <Image
                        source={{ uri: course.teacher.avatar || 'https://via.placeholder.com/50' }}
                        style={styles.teacherAvatar}
                    />
                    <View style={styles.teacherInfo}>
                        <Text style={styles.teacherLabel}>Instructor</Text>
                        <View style={styles.teacherName}>
                            <Text style={styles.teacherNameText}>{course.teacher.username}</Text>
                            {course.teacher.isVerified && (
                                <IconSymbol
                                    ios_icon_name="checkmark.seal.fill"
                                    android_material_icon_name="verified"
                                    size={16}
                                    color={colors.primary}
                                />
                            )}
                        </View>
                    </View>
                    <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={20}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>

                {/* Progress (if enrolled) */}
                {course.isEnrolled && (
                    <View style={styles.progressCard}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressTitle}>Your Progress</Text>
                            <Text style={styles.progressPercent}>{progressPercent}%</Text>
                        </View>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                        </View>
                        <Text style={styles.progressSubtext}>
                            {completedLessons} of {course.lessons.length} lessons completed
                        </Text>
                    </View>
                )}

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About this course</Text>
                    <Text style={styles.description}>{course.description || 'No description available.'}</Text>
                </View>

                {/* Curriculum */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Curriculum ({course.lessons.length} lessons)
                    </Text>
                    {course.lessons.map((lesson, index) => {
                        const icons = getContentTypeIcon(lesson.contentType);
                        const isAccessible = course.isEnrolled || lesson.isPreview;

                        return (
                            <TouchableOpacity
                                key={lesson.id}
                                style={[styles.lessonItem, !isAccessible && styles.lessonLocked]}
                                onPress={() => handleLessonPress(lesson)}
                            >
                                <View style={styles.lessonNumber}>
                                    {lesson.progress >= 100 ? (
                                        <IconSymbol
                                            ios_icon_name="checkmark.circle.fill"
                                            android_material_icon_name="check-circle"
                                            size={24}
                                            color={colors.highlight}
                                        />
                                    ) : (
                                        <Text style={styles.lessonNumberText}>{index + 1}</Text>
                                    )}
                                </View>
                                <View style={styles.lessonContent}>
                                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                                    <View style={styles.lessonMeta}>
                                        <IconSymbol
                                            ios_icon_name={icons.ios}
                                            android_material_icon_name={icons.android as any}
                                            size={14}
                                            color={colors.textSecondary}
                                        />
                                        <Text style={styles.lessonDuration}>
                                            {lesson.durationMinutes ? `${lesson.durationMinutes} min` : lesson.contentType}
                                        </Text>
                                        {lesson.isPreview && (
                                            <View style={styles.previewBadge}>
                                                <Text style={styles.previewText}>Preview</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                {!isAccessible && (
                                    <IconSymbol
                                        ios_icon_name="lock.fill"
                                        android_material_icon_name="lock"
                                        size={20}
                                        color={colors.textSecondary}
                                    />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Spacer for bottom button */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Button */}
            {!course.isEnrolled ? (
                <View style={styles.bottomBar}>
                    <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Price</Text>
                        <Text style={styles.priceValue}>{course.price} 🪙</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.enrollButton}
                        onPress={handleEnroll}
                        disabled={isEnrolling}
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.enrollButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {isEnrolling ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.enrollButtonText}>Enroll Now</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={styles.continueButton}
                        onPress={() => {
                            const lastLesson = course.enrollment?.lastLessonId
                                ? course.lessons.find(l => l.id === course.enrollment?.lastLessonId)
                                : course.lessons[0];
                            if (lastLesson) {
                                handleLessonPress(lastLesson);
                            }
                        }}
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.continueButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <IconSymbol
                                ios_icon_name="play.fill"
                                android_material_icon_name="play-arrow"
                                size={24}
                                color="#FFFFFF"
                            />
                            <Text style={styles.continueButtonText}>
                                {progressPercent > 0 ? 'Continue Learning' : 'Start Course'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
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
    heroContainer: {
        height: 280,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.border,
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 40,
        left: spacing.md,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroContent: {
        position: 'absolute',
        bottom: spacing.lg,
        left: spacing.md,
        right: spacing.md,
    },
    heroTitle: {
        ...typography.h2,
        color: '#FFFFFF',
        marginBottom: spacing.sm,
    },
    heroStats: {
        flexDirection: 'row',
        gap: spacing.lg,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    statText: {
        ...typography.caption,
        color: '#FFFFFF',
    },
    teacherCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        margin: spacing.md,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        ...shadows.sm,
    },
    teacherAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.border,
    },
    teacherInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    teacherLabel: {
        ...typography.small,
        color: colors.textSecondary,
    },
    teacherName: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    teacherNameText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    progressCard: {
        margin: spacing.md,
        marginTop: 0,
        padding: spacing.md,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        ...shadows.sm,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    progressTitle: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    progressPercent: {
        ...typography.body,
        fontWeight: '700',
        color: colors.primary,
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.border,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.highlight,
        borderRadius: 4,
    },
    progressSubtext: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    section: {
        padding: spacing.md,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.md,
    },
    description: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    lessonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    lessonLocked: {
        opacity: 0.6,
    },
    lessonNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    lessonNumberText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    lessonContent: {
        flex: 1,
    },
    lessonTitle: {
        ...typography.body,
        fontWeight: '500',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    lessonMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    lessonDuration: {
        ...typography.small,
        color: colors.textSecondary,
    },
    previewBadge: {
        backgroundColor: colors.highlight,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        marginLeft: spacing.sm,
    },
    previewText: {
        ...typography.small,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        ...shadows.lg,
    },
    priceContainer: {
        marginRight: spacing.lg,
    },
    priceLabel: {
        ...typography.small,
        color: colors.textSecondary,
    },
    priceValue: {
        ...typography.h3,
        color: colors.accent,
        fontWeight: '700',
    },
    enrollButton: {
        flex: 1,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    enrollButtonGradient: {
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    enrollButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    continueButton: {
        flex: 1,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    continueButtonGradient: {
        flexDirection: 'row',
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    continueButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});
