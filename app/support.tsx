
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Linking,
    ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';

// FAQ Data
const FAQ_DATA = [
    {
        question: 'How do I reset my password?',
        answer: 'Go to Settings > Security and tap "Change Password". You will receive an email with instructions.',
    },
    {
        question: 'How do I earn coins?',
        answer: 'You earn coins by: Liking posts (+1), Commenting (+2), Sharing (+2), Following users (+3), Creating posts (+10), and Creating stories (+5).',
    },
    {
        question: 'How do I become a verified user?',
        answer: 'Verified badges are given to notable public figures, celebrities, and brands. Contact support to apply for verification.',
    },
    {
        question: 'How do I delete my account?',
        answer: 'Go to Settings and tap "Delete Account". This action is permanent and cannot be undone.',
    },
    {
        question: 'How do I report inappropriate content?',
        answer: 'Tap the three dots (...) on any post and select "Report". Our team will review it within 24 hours.',
    },
    {
        question: 'How do I contact a celebrity for VIP chat?',
        answer: 'Navigate to the VIP Chat section, select a celebrity, and pay per message using your wallet balance.',
    },
];

export default function SupportScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const handleSubmitReport = async () => {
        if (!subject.trim() || !description.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setIsSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        setIsSubmitting(false);
        Alert.alert(
            'Report Submitted',
            'Thank you for your feedback. Our team will review it and get back to you within 24-48 hours.',
            [{ text: 'OK', onPress: () => { setSubject(''); setDescription(''); } }]
        );
    };

    const handleEmailSupport = () => {
        Linking.openURL('mailto:help@snapgram.com');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen
                options={{
                    title: 'Help & Support',
                    headerShown: true,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Contact Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact Us</Text>
                    <TouchableOpacity style={styles.contactCard} onPress={handleEmailSupport}>
                        <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={24} color={colors.primary} />
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactLabel}>Email Support</Text>
                            <Text style={styles.contactValue}>help@snapgram.com</Text>
                        </View>
                        <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Report Issue Form */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Report an Issue</Text>
                    <View style={styles.formCard}>
                        <TextInput
                            style={styles.input}
                            placeholder="Subject"
                            placeholderTextColor={colors.textSecondary}
                            value={subject}
                            onChangeText={setSubject}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe your issue..."
                            placeholderTextColor={colors.textSecondary}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                        />
                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                            onPress={handleSubmitReport}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.submitButtonText}>Submit Report</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* FAQ Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                    {FAQ_DATA.map((faq, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.faqItem}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setExpandedFaq(expandedFaq === index ? null : index);
                            }}
                        >
                            <View style={styles.faqHeader}>
                                <Text style={styles.faqQuestion}>{faq.question}</Text>
                                <IconSymbol
                                    ios_icon_name={expandedFaq === index ? "chevron.up" : "chevron.down"}
                                    android_material_icon_name={expandedFaq === index ? "expand-less" : "expand-more"}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </View>
                            {expandedFaq === index && (
                                <Text style={styles.faqAnswer}>{faq.answer}</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.md,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        gap: spacing.md,
    },
    contactInfo: {
        flex: 1,
    },
    contactLabel: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
    },
    contactValue: {
        ...typography.caption,
        color: colors.primary,
        marginTop: 2,
    },
    formCard: {
        backgroundColor: colors.card,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        gap: spacing.md,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        padding: spacing.md,
        color: colors.text,
        ...typography.body,
    },
    textArea: {
        minHeight: 120,
    },
    submitButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    faqItem: {
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    faqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqQuestion: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
        flex: 1,
        marginRight: spacing.sm,
    },
    faqAnswer: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.sm,
        lineHeight: 22,
    },
});
