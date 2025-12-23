
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import * as Haptics from 'expo-haptics';

interface LessonDraft {
    id: string;
    title: string;
    description: string;
    contentType: 'video' | 'text' | 'pdf';
    videoUrl?: string;
    textContent?: string;
    pdfUri?: string;
    durationMinutes?: number;
}

export default function CreateCourseScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'details' | 'lessons' | 'preview'>('details');

    // Course details
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
    const [priceCoins, setPriceCoins] = useState('');
    const [durationHours, setDurationHours] = useState('');

    // Lessons
    const [lessons, setLessons] = useState<LessonDraft[]>([]);
    const [editingLesson, setEditingLesson] = useState<LessonDraft | null>(null);

    const handlePickThumbnail = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setThumbnailUri(result.assets[0].uri);
        }
    };

    const addLesson = () => {
        const newLesson: LessonDraft = {
            id: Date.now().toString(),
            title: '',
            description: '',
            contentType: 'video',
        };
        setEditingLesson(newLesson);
    };

    const saveLesson = (lesson: LessonDraft) => {
        if (!lesson.title.trim()) {
            Alert.alert('Error', 'Please enter a lesson title');
            return;
        }

        const existingIndex = lessons.findIndex(l => l.id === lesson.id);
        if (existingIndex >= 0) {
            setLessons(prev => prev.map(l => l.id === lesson.id ? lesson : l));
        } else {
            setLessons(prev => [...prev, lesson]);
        }
        setEditingLesson(null);
    };

    const removeLesson = (lessonId: string) => {
        setLessons(prev => prev.filter(l => l.id !== lessonId));
    };

    const validateDetails = () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a course title');
            return false;
        }
        if (!description.trim() || description.length < 20) {
            Alert.alert('Error', 'Please enter a description (at least 20 characters)');
            return false;
        }
        if (!priceCoins || parseInt(priceCoins) < 0) {
            Alert.alert('Error', 'Please enter a valid price (0 for free)');
            return false;
        }
        return true;
    };

    const handleNextStep = () => {
        if (step === 'details') {
            if (validateDetails()) {
                setStep('lessons');
            }
        } else if (step === 'lessons') {
            if (lessons.length === 0) {
                Alert.alert('Error', 'Please add at least one lesson');
                return;
            }
            setStep('preview');
        }
    };

    const handlePublish = async () => {
        setIsLoading(true);
        try {
            // Create the course
            const courseResponse = await apiClient.createCourse({
                title: title.trim(),
                description: description.trim(),
                thumbnailUri: thumbnailUri || undefined,
                priceCoins: parseInt(priceCoins) || 0,
                durationHours: durationHours ? parseInt(durationHours) : undefined,
            });

            const courseId = courseResponse.data.id;

            // Add lessons
            for (let i = 0; i < lessons.length; i++) {
                const lesson = lessons[i];
                await apiClient.addLesson(courseId, {
                    title: lesson.title,
                    description: lesson.description || undefined,
                    contentType: lesson.contentType,
                    videoUrl: lesson.videoUrl,
                    textContent: lesson.textContent,
                    pdfUri: lesson.pdfUri,
                    durationMinutes: lesson.durationMinutes,
                    orderIndex: i,
                    isPreview: i === 0, // First lesson is free preview
                });
            }

            // Publish the course
            await apiClient.publishCourse(courseId);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'Course Published!',
                'Your course is now live and available for students.',
                [{ text: 'View Course', onPress: () => router.replace(`/courses/${courseId}`) }]
            );
        } catch (error: any) {
            console.error('Failed to create course:', error);
            Alert.alert('Error', error.message || 'Failed to create course');
        } finally {
            setIsLoading(false);
        }
    };

    // Lesson Editor Modal
    if (editingLesson) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Add Lesson', headerShown: true }} />
                <ScrollView style={styles.content}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Lesson Title *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Introduction to React"
                            placeholderTextColor={colors.textSecondary}
                            value={editingLesson.title}
                            onChangeText={(text) => setEditingLesson({ ...editingLesson, title: text })}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Content Type</Text>
                        <View style={styles.contentTypeRow}>
                            {(['video', 'text', 'pdf'] as const).map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.contentTypeButton,
                                        editingLesson.contentType === type && styles.contentTypeButtonSelected,
                                    ]}
                                    onPress={() => setEditingLesson({ ...editingLesson, contentType: type })}
                                >
                                    <IconSymbol
                                        ios_icon_name={type === 'video' ? 'play.circle' : type === 'text' ? 'doc.text' : 'doc'}
                                        android_material_icon_name={type === 'video' ? 'play-circle-outline' : type === 'text' ? 'description' : 'picture-as-pdf'}
                                        size={24}
                                        color={editingLesson.contentType === type ? '#FFFFFF' : colors.text}
                                    />
                                    <Text style={[
                                        styles.contentTypeText,
                                        editingLesson.contentType === type && styles.contentTypeTextSelected,
                                    ]}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {editingLesson.contentType === 'video' && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>YouTube Video URL *</Text>
                            <Text style={styles.hint}>Paste the URL of your YouTube video</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://youtube.com/watch?v=..."
                                placeholderTextColor={colors.textSecondary}
                                value={editingLesson.videoUrl}
                                onChangeText={(text) => setEditingLesson({ ...editingLesson, videoUrl: text })}
                                autoCapitalize="none"
                                keyboardType="url"
                            />
                        </View>
                    )}

                    {editingLesson.contentType === 'text' && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Lesson Content (Markdown)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="# Lesson Title\n\nYour lesson content here..."
                                placeholderTextColor={colors.textSecondary}
                                value={editingLesson.textContent}
                                onChangeText={(text) => setEditingLesson({ ...editingLesson, textContent: text })}
                                multiline
                                numberOfLines={10}
                                textAlignVertical="top"
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="What will students learn in this lesson?"
                            placeholderTextColor={colors.textSecondary}
                            value={editingLesson.description}
                            onChangeText={(text) => setEditingLesson({ ...editingLesson, description: text })}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Duration (minutes)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="15"
                            placeholderTextColor={colors.textSecondary}
                            value={editingLesson.durationMinutes?.toString() || ''}
                            onChangeText={(text) => setEditingLesson({
                                ...editingLesson,
                                durationMinutes: text ? parseInt(text) : undefined
                            })}
                            keyboardType="number-pad"
                        />
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setEditingLesson(null)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={() => saveLesson(editingLesson)}
                        >
                            <Text style={styles.saveButtonText}>Save Lesson</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: step === 'details' ? 'Course Details' : step === 'lessons' ? 'Add Lessons' : 'Preview',
                    headerShown: true,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
            />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Step Indicator */}
                <View style={styles.stepIndicator}>
                    {['details', 'lessons', 'preview'].map((s, i) => (
                        <View key={s} style={styles.stepItem}>
                            <View style={[
                                styles.stepCircle,
                                (step === s || ['details', 'lessons', 'preview'].indexOf(step) > i) && styles.stepCircleActive,
                            ]}>
                                <Text style={[
                                    styles.stepNumber,
                                    (step === s || ['details', 'lessons', 'preview'].indexOf(step) > i) && styles.stepNumberActive,
                                ]}>
                                    {i + 1}
                                </Text>
                            </View>
                            <Text style={styles.stepLabel}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Step 1: Details */}
                {step === 'details' && (
                    <>
                        <TouchableOpacity style={styles.thumbnailPicker} onPress={handlePickThumbnail}>
                            {thumbnailUri ? (
                                <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImage} />
                            ) : (
                                <>
                                    <IconSymbol
                                        ios_icon_name="photo.badge.plus"
                                        android_material_icon_name="add-photo-alternate"
                                        size={48}
                                        color={colors.textSecondary}
                                    />
                                    <Text style={styles.thumbnailText}>Add Thumbnail</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Course Title *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Complete React Native Course"
                                placeholderTextColor={colors.textSecondary}
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="What will students learn in this course?"
                                placeholderTextColor={colors.textSecondary}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Price (Coins) *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="500"
                                    placeholderTextColor={colors.textSecondary}
                                    value={priceCoins}
                                    onChangeText={setPriceCoins}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.md }]}>
                                <Text style={styles.label}>Duration (Hours)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="10"
                                    placeholderTextColor={colors.textSecondary}
                                    value={durationHours}
                                    onChangeText={setDurationHours}
                                    keyboardType="number-pad"
                                />
                            </View>
                        </View>
                    </>
                )}

                {/* Step 2: Lessons */}
                {step === 'lessons' && (
                    <>
                        <Text style={styles.sectionTitle}>Course Lessons ({lessons.length})</Text>
                        <Text style={styles.sectionHint}>
                            Add lessons to your course. The first lesson will be available as a free preview.
                        </Text>

                        {lessons.map((lesson, index) => (
                            <View key={lesson.id} style={styles.lessonCard}>
                                <View style={styles.lessonNumber}>
                                    <Text style={styles.lessonNumberText}>{index + 1}</Text>
                                </View>
                                <View style={styles.lessonInfo}>
                                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                                    <Text style={styles.lessonType}>
                                        {lesson.contentType} • {lesson.durationMinutes || '?'} min
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setEditingLesson(lesson)}>
                                    <IconSymbol
                                        ios_icon_name="pencil"
                                        android_material_icon_name="edit"
                                        size={20}
                                        color={colors.primary}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => removeLesson(lesson.id)}>
                                    <IconSymbol
                                        ios_icon_name="trash"
                                        android_material_icon_name="delete"
                                        size={20}
                                        color={colors.error}
                                    />
                                </TouchableOpacity>
                            </View>
                        ))}

                        <TouchableOpacity style={styles.addLessonButton} onPress={addLesson}>
                            <IconSymbol
                                ios_icon_name="plus.circle.fill"
                                android_material_icon_name="add-circle"
                                size={24}
                                color={colors.primary}
                            />
                            <Text style={styles.addLessonText}>Add Lesson</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* Step 3: Preview */}
                {step === 'preview' && (
                    <>
                        <Text style={styles.sectionTitle}>Course Preview</Text>

                        {thumbnailUri && (
                            <Image source={{ uri: thumbnailUri }} style={styles.previewThumbnail} />
                        )}

                        <Text style={styles.previewTitle}>{title}</Text>
                        <Text style={styles.previewDescription}>{description}</Text>

                        <View style={styles.previewStats}>
                            <Text style={styles.previewStat}>💰 {priceCoins || '0'} coins</Text>
                            <Text style={styles.previewStat}>📚 {lessons.length} lessons</Text>
                            {durationHours && <Text style={styles.previewStat}>⏱ {durationHours}h</Text>}
                        </View>

                        <Text style={styles.sectionSubtitle}>Curriculum</Text>
                        {lessons.map((lesson, index) => (
                            <View key={lesson.id} style={styles.previewLesson}>
                                <Text style={styles.previewLessonNumber}>{index + 1}.</Text>
                                <Text style={styles.previewLessonTitle}>{lesson.title}</Text>
                                {index === 0 && <Text style={styles.previewBadge}>Preview</Text>}
                            </View>
                        ))}
                    </>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomBar}>
                {step !== 'details' && (
                    <TouchableOpacity
                        style={styles.backStepButton}
                        onPress={() => setStep(step === 'preview' ? 'lessons' : 'details')}
                    >
                        <Text style={styles.backStepText}>Back</Text>
                    </TouchableOpacity>
                )}

                {step !== 'preview' ? (
                    <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.nextButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.nextButtonText}>
                                {step === 'details' ? 'Add Lessons' : 'Preview'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.publishButton}
                        onPress={handlePublish}
                        disabled={isLoading}
                    >
                        <LinearGradient
                            colors={[colors.highlight, '#27ae60']}
                            style={styles.publishButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <IconSymbol
                                        ios_icon_name="checkmark.circle.fill"
                                        android_material_icon_name="check-circle"
                                        size={24}
                                        color="#FFFFFF"
                                    />
                                    <Text style={styles.publishButtonText}>Publish Course</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    stepIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: spacing.xl,
        gap: spacing.xl,
    },
    stepItem: {
        alignItems: 'center',
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    stepCircleActive: {
        backgroundColor: colors.primary,
    },
    stepNumber: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    stepNumberActive: {
        color: '#FFFFFF',
    },
    stepLabel: {
        ...typography.small,
        color: colors.textSecondary,
    },
    thumbnailPicker: {
        height: 180,
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    thumbnailText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    hint: {
        ...typography.small,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        ...typography.body,
        color: colors.text,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    sectionHint: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    sectionSubtitle: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    lessonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        gap: spacing.md,
    },
    lessonNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lessonNumberText: {
        ...typography.caption,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    lessonInfo: {
        flex: 1,
    },
    lessonTitle: {
        ...typography.body,
        color: colors.text,
        fontWeight: '500',
    },
    lessonType: {
        ...typography.small,
        color: colors.textSecondary,
    },
    addLessonButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderWidth: 2,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    addLessonText: {
        ...typography.body,
        color: colors.primary,
        fontWeight: '600',
    },
    contentTypeRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    contentTypeButton: {
        flex: 1,
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    contentTypeButtonSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    contentTypeText: {
        ...typography.small,
        color: colors.text,
        marginTop: spacing.xs,
    },
    contentTypeTextSelected: {
        color: '#FFFFFF',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    cancelButton: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    cancelButtonText: {
        ...typography.body,
        color: colors.text,
    },
    saveButton: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    saveButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    previewThumbnail: {
        width: '100%',
        height: 180,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    previewTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    previewDescription: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.md,
        lineHeight: 22,
    },
    previewStats: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginBottom: spacing.lg,
    },
    previewStat: {
        ...typography.body,
        color: colors.text,
    },
    previewLesson: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        gap: spacing.sm,
    },
    previewLessonNumber: {
        ...typography.body,
        color: colors.textSecondary,
        width: 24,
    },
    previewLessonTitle: {
        ...typography.body,
        color: colors.text,
        flex: 1,
    },
    previewBadge: {
        ...typography.small,
        color: colors.highlight,
        backgroundColor: 'rgba(46, 204, 113, 0.2)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    bottomBar: {
        flexDirection: 'row',
        padding: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.md,
    },
    backStepButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backStepText: {
        ...typography.body,
        color: colors.text,
    },
    nextButton: {
        flex: 1,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    nextButtonGradient: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    nextButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    publishButton: {
        flex: 1,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    publishButtonGradient: {
        flexDirection: 'row',
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    publishButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});
