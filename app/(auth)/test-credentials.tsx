
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useAuthStore } from '@/stores/authStore';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';

interface TestAccount {
  name: string;
  email: string;
  password: string;
  role: string;
  coins: number;
  description: string;
  icon: string;
  androidIcon: string;
  gradient: string[];
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    name: 'Test User',
    email: 'user@test.com',
    password: 'Test1234!',
    role: 'Regular User',
    coins: 5000,
    description: 'Standard user account with basic features',
    icon: 'person.fill',
    androidIcon: 'person',
    gradient: ['#667eea', '#764ba2'],
  },
  {
    name: 'Celebrity Star',
    email: 'celebrity@test.com',
    password: 'Test1234!',
    role: 'Celebrity',
    coins: 10000,
    description: 'Celebrity account with paid chat (50 coins/message)',
    icon: 'star.fill',
    androidIcon: 'star',
    gradient: ['#f093fb', '#f5576c'],
  },
  {
    name: 'Professor Tutor',
    email: 'teacher@test.com',
    password: 'Test1234!',
    role: 'Teacher',
    coins: 3000,
    description: 'Teacher account with course creation abilities',
    icon: 'book.fill',
    androidIcon: 'book',
    gradient: ['#4facfe', '#00f2fe'],
  },
  {
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'Admin1234!',
    role: 'Administrator',
    coins: 1000,
    description: 'Admin account with full platform access',
    icon: 'shield.fill',
    androidIcon: 'shield',
    gradient: ['#fa709a', '#fee140'],
  },
];

export default function TestCredentialsScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loadingAccount, setLoadingAccount] = useState<string | null>(null);

  const handleQuickLogin = async (account: TestAccount) => {
    setLoadingAccount(account.email);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // TODO: Backend Integration - Login with test credentials
      await login(account.email, account.password);
      Alert.alert('Success', `Logged in as ${account.name}`, [
        {
          text: 'OK',
          onPress: () => router.replace('/(drawer)/(tabs)/(home)'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Could not log in. Backend may still be building.');
    } finally {
      setLoadingAccount(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.iconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <IconSymbol
                ios_icon_name="key.fill"
                android_material_icon_name="key"
                size={32}
                color="#FFFFFF"
              />
            </LinearGradient>
            <Text style={styles.title}>Test Credentials</Text>
            <Text style={styles.subtitle}>
              Quick login with pre-configured test accounts
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.infoText}>
            These accounts are pre-loaded with data and coins for testing all platform features.
          </Text>
        </View>

        <View style={styles.accountsContainer}>
          {TEST_ACCOUNTS.map((account, index) => (
            <View key={index} style={styles.accountCard}>
              <LinearGradient
                colors={account.gradient as [string, string, ...string[]]}
                style={styles.accountHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.accountHeaderContent}>
                  <IconSymbol
                    ios_icon_name={account.icon as any}
                    android_material_icon_name={account.androidIcon as any}
                    size={32}
                    color="#FFFFFF"
                  />
                  <View style={styles.accountHeaderText}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountRole}>{account.role}</Text>
                  </View>
                </View>
                <View style={styles.coinsContainer}>
                  <IconSymbol
                    ios_icon_name="dollarsign.circle.fill"
                    android_material_icon_name="monetization-on"
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.coinsText}>{account.coins.toLocaleString()}</Text>
                </View>
              </LinearGradient>

              <View style={styles.accountBody}>
                <Text style={styles.accountDescription}>{account.description}</Text>

                <View style={styles.credentialsContainer}>
                  <View style={styles.credentialRow}>
                    <Text style={styles.credentialLabel}>Email:</Text>
                    <TouchableOpacity
                      style={styles.credentialValue}
                      onPress={() => copyToClipboard(account.email, 'Email')}
                    >
                      <Text style={styles.credentialText}>{account.email}</Text>
                      <IconSymbol
                        ios_icon_name="doc.on.doc"
                        android_material_icon_name="content-copy"
                        size={16}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.credentialRow}>
                    <Text style={styles.credentialLabel}>Password:</Text>
                    <TouchableOpacity
                      style={styles.credentialValue}
                      onPress={() => copyToClipboard(account.password, 'Password')}
                    >
                      <Text style={styles.credentialText}>{account.password}</Text>
                      <IconSymbol
                        ios_icon_name="doc.on.doc"
                        android_material_icon_name="content-copy"
                        size={16}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => handleQuickLogin(account)}
                  disabled={loadingAccount !== null}
                >
                  <LinearGradient
                    colors={account.gradient as [string, string, ...string[]]}
                    style={styles.loginButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loadingAccount === account.email ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <IconSymbol
                          ios_icon_name="arrow.right.circle.fill"
                          android_material_icon_name="login"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text style={styles.loginButtonText}>Quick Login</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.backendInfo}>
          <Text style={styles.backendTitle}>Backend Information</Text>
          <View style={styles.backendRow}>
            <Text style={styles.backendLabel}>API URL:</Text>
            <TouchableOpacity
              onPress={() =>
                copyToClipboard(
                  'https://v6r7hhgft77nghz9ncgpb9mfgkx69bg4.app.specular.dev',
                  'API URL'
                )
              }
            >
              <Text style={styles.backendValue}>
                v6r7hhgft77nghz9ncgpb9mfgkx69bg4.app.specular.dev
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.backendRow}>
            <Text style={styles.backendLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Building</Text>
            </View>
          </View>
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
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xxl + 20,
  },
  header: {
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  infoText: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  accountsContainer: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  accountCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountHeader: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accountHeaderText: {
    gap: 2,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accountRole: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  coinsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accountBody: {
    padding: spacing.md,
    gap: spacing.md,
  },
  accountDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  credentialsContainer: {
    gap: spacing.sm,
  },
  credentialRow: {
    gap: spacing.xs,
  },
  credentialLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  credentialValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  credentialText: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'monospace',
  },
  loginButton: {
    marginTop: spacing.xs,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backendInfo: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  backendTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  backendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backendLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    width: 80,
  },
  backendValue: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: 'monospace',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  statusText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
});
