
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

export default function PrivacyPolicyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen
                options={{
                    title: 'Privacy Policy',
                    headerShown: true,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.lastUpdated}>Last Updated: December 9, 2024</Text>

                <Text style={styles.sectionTitle}>1. Information We Collect</Text>
                <Text style={styles.paragraph}>
                    We collect information you provide directly to us, including your name, email address,
                    profile information, and content you create on SnapGram. We also collect information
                    about your usage of our services.
                </Text>

                <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
                <Text style={styles.paragraph}>
                    We use the information we collect to provide, maintain, and improve our services,
                    to communicate with you, and to personalize your experience. We may also use
                    information for security and fraud prevention.
                </Text>

                <Text style={styles.sectionTitle}>3. Information Sharing</Text>
                <Text style={styles.paragraph}>
                    We do not sell your personal information. We may share information with third-party
                    service providers who perform services on our behalf, or when required by law.
                </Text>

                <Text style={styles.sectionTitle}>4. Data Security</Text>
                <Text style={styles.paragraph}>
                    We implement appropriate security measures to protect your personal information.
                    However, no method of transmission over the Internet is 100% secure.
                </Text>

                <Text style={styles.sectionTitle}>5. Your Rights</Text>
                <Text style={styles.paragraph}>
                    You have the right to access, update, or delete your personal information at any time.
                    You can also request a copy of your data through the Settings page.
                </Text>

                <Text style={styles.sectionTitle}>6. Cookies and Tracking</Text>
                <Text style={styles.paragraph}>
                    We use cookies and similar technologies to provide and improve our services.
                    You can manage your cookie preferences in your device settings.
                </Text>

                <Text style={styles.sectionTitle}>7. Changes to This Policy</Text>
                <Text style={styles.paragraph}>
                    We may update this Privacy Policy from time to time. We will notify you of any
                    changes by posting the new policy on this page.
                </Text>

                <Text style={styles.sectionTitle}>8. Contact Us</Text>
                <Text style={styles.paragraph}>
                    If you have any questions about this Privacy Policy, please contact us at:
                </Text>
                <Text style={styles.email}>help@snapgram.com</Text>
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
