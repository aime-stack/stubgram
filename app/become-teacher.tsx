import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import * as Haptics from 'expo-haptics';

const EXPERTISE_OPTIONS = [
    'Programming',
    'Design',
    'Marketing',
    'Business',
    'Photography',
    'Music',
    'Languages',
    'Finance',
    'Health & Fitness',
    'Personal Development',
];

export default function TeacherApplicationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingApplication, setExistingApplication] = useState<any>(null);

    const [youtubeChannel, setYoutubeChannel] = useState('');
    const [bio, setBio] = useState('');
    const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
    const [sampleUrl, setSampleUrl] = useState('');

    useEffect(() => {
        checkExistingApplication();
    }, []);

    const checkExistingApplication = async () => {
        try {
            const response = await apiClient.getTeacherApplicationStatus();
            if (response.data) {
                setExistingApplication(response.data);
            }
        } catch (error) {
            console.error('Failed to check application status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpertise = (expertise: string) => {
        setSelectedExpertise(prev =>
            prev.includes(expertise)
                ? prev.filter(e => e !== expertise)
                : [...prev, expertise]
        );
    };

    const handleSubmit = async () => {
        if (!youtubeChannel.trim()) {
            Alert.alert('Error', 'Please enter your YouTube channel URL');
            return;
        }
        if (!bio.trim() || bio.length < 50) {
            Alert.alert('Error', 'Please write a bio (at least 50 characters)');
            return;
        }
        if (selectedExpertise.length === 0) {
            Alert.alert('Error', 'Please select at least one area of expertise');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.applyAsTeacher({
                youtubeChannelUrl: youtubeChannel.trim(),
                bio: bio.trim(),
                expertise: selectedExpertise,
                sampleContentUrl: sampleUrl.trim() || undefined,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'Application Submitted!',
                'Your teacher application has been submitted. We will review it and get back to you soon.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error: any) {
            console.error('Application failed:', error);
            Alert.alert('Error', error.message || 'Failed to submit application');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Show existing application status
    if (existingApplication) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'Teacher Application',
                        headerShown: true,
                        headerStyle: { backgroundColor: colors.background },
                        headerTintColor: colors.text,
                    }}
                />
                <View style={styles.statusContainer}>
                    <View style={[
                        styles.statusBadge,
                        existingApplication.status === 'approved' && styles.statusApproved,
                        existingApplication.status === 'rejected' && styles.statusRejected,
                    ]}>
                        <IconSymbol
                            ios_icon_name={
                                existingApplication.status === 'approved' ? 'checkmark.circle.fill' :
                                    existingApplication.status === 'rejected' ? 'xmark.circle.fill' :
                                        'clock.fill'
                            }
                            android_material_icon_name={
                                existingApplication.status === 'approved' ? 'check-circle' :
                                    existingApplication.status === 'rejected' ? 'cancel' :
                                        'schedule'
                            }
                            size={64}
                            color={
                                existingApplication.status === 'approved' ? colors.highlight :
                                    existingApplication.status === 'rejected' ? colors.error :
                                        colors.accent
                            }
                        />
                    </View>
                    <Text style={styles.statusTitle}>
                        {existingApplication.status === 'approved' ? 'You\'re a Teacher!' :
                            existingApplication.status === 'rejected' ? 'Application Rejected' :
                                'Application Pending'}
                    </Text>
                    <Text style={styles.statusText}>
                        {existingApplication.status === 'approved'
                            ? 'Congratulations! You can now create courses.'
                            : existingApplication.status === 'rejected'
                                ? existingApplication.rejection_reason || 'Your application was not approved.'
                                : 'Your application is being reviewed. We\'ll notify you once it\'s processed.'}
                    </Text>
                    {existingApplication.status === 'approved' && (
                        <TouchableOpacity
                            style={styles.createButton}
                            onPress={() => router.push('/create-course')}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={styles.createButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <IconSymbol
                                    ios_icon_name="plus.circle.fill"
                                    android_material_icon_name="add-circle"
                                    size={24}
                                    color="#FFFFFF"
                                />
                                <Text style={styles.createButtonText}>Create Your First Course</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Become a Teacher',
                    headerShown: true,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                >
                    <View style={styles.header}>
                        <IconSymbol
                            ios_icon_name="graduationcap.fill"
                            android_material_icon_name="school"
                            size={48}
                            color={colors.primary}
                        />
                        <Text style={styles.headerTitle}>Share Your Knowledge</Text>
                        <Text style={styles.headerSubtitle}>
                            Apply to become a teacher and create courses to share with our community.
                        </Text>
                    </View>

                    {/* YouTube Channel */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>YouTube Channel URL *</Text>
                        <Text style={styles.hint}>
                            Your videos will be embedded from your YouTube channel
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="https://youtube.com/@yourchannel"
                            placeholderTextColor={colors.textSecondary}
                            value={youtubeChannel}
                            onChangeText={setYoutubeChannel}
                            autoCapitalize="none"
                            keyboardType="url"
                        />
                    </View>

                    {/* Bio */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>About You *</Text>
                        <Text style={styles.hint}>
                            Tell us about your background and teaching experience (min 50 chars)
                        </Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="I'm a software engineer with 5 years of experience..."
                            placeholderTextColor={colors.textSecondary}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                        <Text style={styles.charCount}>{bio.length}/50+</Text>
                    </View>

                    {/* Expertise */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Areas of Expertise *</Text>
                        <Text style={styles.hint}>Select all that apply</Text>
                        <View style={styles.expertiseGrid}>
                            {EXPERTISE_OPTIONS.map(exp => (
                                <TouchableOpacity
                                    key={exp}
                                    style={[
                                        styles.expertiseChip,
                                        selectedExpertise.includes(exp) && styles.expertiseChipSelected,
                                    ]}
                                    onPress={() => toggleExpertise(exp)}
                                >
                                    <Text style={[
                                        styles.expertiseChipText,
                                        selectedExpertise.includes(exp) && styles.expertiseChipTextSelected,
                                    ]}>
                                        {exp}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Sample Content URL */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Sample Content URL (Optional)</Text>
                        <Text style={styles.hint}>
                            Link to a video, blog post, or any content you've created
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="https://..."
                            placeholderTextColor={colors.textSecondary}
                            value={sampleUrl}
                            onChangeText={setSampleUrl}
                            autoCapitalize="none"
                            keyboardType="url"
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.submitButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitButtonText}>Submit Application</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: spacing.xxl }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
    content: {
        flex: 1,
        padding: spacing.md,
    },
    header: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    headerTitle: {
        ...typography.h2,
        color: colors.text,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    headerSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
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
        minHeight: 120,
        textAlignVertical: 'top',
    },
    charCount: {
        ...typography.small,
        color: colors.textSecondary,
        textAlign: 'right',
        marginTop: spacing.xs,
    },
    expertiseGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    expertiseChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.full,
    },
    expertiseChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    expertiseChipText: {
        ...typography.caption,
        color: colors.text,
    },
    expertiseChipTextSelected: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    submitButton: {
        marginTop: spacing.lg,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    submitButtonGradient: {
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    statusContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    statusBadge: {
        marginBottom: spacing.lg,
    },
    statusApproved: {},
    statusRejected: {},
    statusTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    statusText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    createButton: {
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    createButtonGradient: {
        flexDirection: 'row',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        gap: spacing.sm,
    },
    createButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});
