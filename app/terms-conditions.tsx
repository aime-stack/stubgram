
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

export default function TermsConditionsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen
                options={{
                    title: 'Terms & Conditions',
                    headerShown: true,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.lastUpdated}>Last Updated: December 9, 2024</Text>

                <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
                <Text style={styles.paragraph}>
                    By accessing and using Stubgram, you agree to be bound by these Terms and Conditions
                    and all applicable laws and regulations. If you do not agree with any of these terms,
                    you are prohibited from using this service.
                </Text>

                <Text style={styles.sectionTitle}>2. User Accounts</Text>
                <Text style={styles.paragraph}>
                    You are responsible for maintaining the confidentiality of your account and password.
                    You agree to accept responsibility for all activities that occur under your account.
                    You must be at least 13 years old to use Stubgram.
                </Text>

                <Text style={styles.sectionTitle}>3. User Content</Text>
                <Text style={styles.paragraph}>
                    You retain ownership of content you post on Stubgram. By posting content, you grant
                    us a non-exclusive, worldwide, royalty-free license to use, display, and distribute
                    your content on our platform.
                </Text>

                <Text style={styles.sectionTitle}>4. Prohibited Activities</Text>
                <Text style={styles.paragraph}>
                    You agree not to: post illegal or harmful content, harass other users, impersonate
                    others, spam or use automated systems without permission, or attempt to circumvent
                    our security measures.
                </Text>

                <Text style={styles.sectionTitle}>5. Virtual Currency (Coins)</Text>
                <Text style={styles.paragraph}>
                    Snap Coins are virtual currency with no real-world monetary value. Coins can be
                    earned through platform activities or purchased. Coins are non-refundable and
                    non-transferable. We reserve the right to modify coin values and earnings.
                </Text>

                <Text style={styles.sectionTitle}>6. Premium Subscriptions</Text>
                <Text style={styles.paragraph}>
                    Premium subscriptions are billed monthly. Subscriptions renew automatically unless
                    cancelled. Refunds are handled on a case-by-case basis. Feature availability may
                    change over time.
                </Text>

                <Text style={styles.sectionTitle}>7. VIP Celebrity Chat</Text>
                <Text style={styles.paragraph}>
                    Messages to celebrities are paid services with no guaranteed response. Message
                    costs are deducted from your wallet balance immediately. We do not guarantee
                    celebrity availability or response times.
                </Text>

                <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
                <Text style={styles.paragraph}>
                    Stubgram is provided "as is" without warranties of any kind. We are not liable for
                    any indirect, incidental, or consequential damages arising from your use of the service.
                </Text>

                <Text style={styles.sectionTitle}>9. Termination</Text>
                <Text style={styles.paragraph}>
                    We may terminate or suspend your account at any time for violations of these terms.
                    You may delete your account at any time through the Settings page.
                </Text>

                <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
                <Text style={styles.paragraph}>
                    We reserve the right to modify these terms at any time. Continued use of the service
                    after changes constitutes acceptance of the new terms.
                </Text>

                <Text style={styles.sectionTitle}>Contact Information</Text>
                <Text style={styles.paragraph}>
                    For questions about these Terms & Conditions, contact us at:
                </Text>
                <Text style={styles.email}>help@Stubgram.com</Text>
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
    lastUpdated: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    paragraph: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    email: {
        ...typography.body,
        color: colors.primary,
        fontWeight: '600',
        marginTop: spacing.sm,
    },
});
