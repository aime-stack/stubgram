
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { PremiumHeader } from '@/components/PremiumHeader';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Type DELETE to confirm account deletion',
              [{ text: 'Cancel', style: 'cancel' }]
            );
          },
        },
      ]
    );
  };

  const handleDownloadData = () => {
    Alert.alert(
      'Download Your Data',
      'We will prepare a copy of your data and send it to your email address. This may take up to 24 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Data',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Request Sent', 'You will receive your data via email within 24 hours.');
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:help@Stubgram.com');
  };

  type SettingsItem =
    | {
      icon: string;
      androidIcon: string;
      label: string;
      onPress: () => void;
      toggle: false;
      value?: undefined;
      onToggle?: undefined;
      danger?: boolean;
    }
    | {
      icon: string;
      androidIcon: string;
      label: string;
      toggle: true;
      value: boolean;
      onToggle: (val: boolean) => void;
      onPress?: undefined;
      danger?: boolean;
    };

  const settingsSections: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person',
          androidIcon: 'person',
          label: 'Edit Profile',
          onPress: () => router.push('/edit-profile'),
          toggle: false,
        },
        {
          icon: 'lock',
          androidIcon: 'lock',
          label: 'Privacy',
          onPress: () => router.push('/privacy-settings'),
          toggle: false,
        },
        {
          icon: 'shield',
          androidIcon: 'security',
          label: 'Security',
          onPress: () => router.push('/security-settings'),
          toggle: false,
        },
      ],
    },
    {
      title: 'Premium & Features',
      items: [
        {
          icon: 'crown.fill',
          androidIcon: 'stars',
          label: 'Premium Plans',
          onPress: () => router.push('/premium'),
          toggle: false,
        },
        {
          icon: 'star.fill',
          androidIcon: 'star',
          label: 'VIP Celebrity Chat',
          onPress: () => router.push('/celebrities'),
          toggle: false,
        },
        {
          icon: 'video.fill',
          androidIcon: 'videocam',
          label: 'Video Spaces',
          onPress: () => router.push('/spaces'),
          toggle: false,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'bell',
          androidIcon: 'notifications',
          label: 'Notifications',
          toggle: true,
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },

      ],
    },
    {
      title: 'Content',
      items: [
        {
          icon: 'bookmark',
          androidIcon: 'bookmark',
          label: 'Saved Posts',
          onPress: () => router.push('/saved-posts'),
          toggle: false,
        },
        {
          icon: 'clock',
          androidIcon: 'history',
          label: 'Watch History',
          onPress: () => router.push('/watch-history'),
          toggle: false,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'questionmark.circle',
          androidIcon: 'help',
          label: 'Help & Support',
          onPress: () => router.push('/support'),
          toggle: false,
        },
        {
          icon: 'envelope',
          androidIcon: 'email',
          label: 'Contact Support',
          onPress: handleContactSupport,
          toggle: false,
        },
        {
          icon: 'doc.text',
          androidIcon: 'description',
          label: 'Privacy Policy',
          onPress: () => router.push('/privacy-policy'),
          toggle: false,
        },
        {
          icon: 'doc.plaintext',
          androidIcon: 'article',
          label: 'Terms & Conditions',
          onPress: () => router.push('/terms-conditions'),
          toggle: false,
        },
      ],
    },
    {
      title: 'Data & Account',
      items: [
        {
          icon: 'arrow.down.doc',
          androidIcon: 'download',
          label: 'Download My Data',
          onPress: handleDownloadData,
          toggle: false,
        },
        {
          icon: 'trash',
          androidIcon: 'delete',
          label: 'Delete Account',
          onPress: handleDeleteAccount,
          toggle: false,
          danger: true,
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <PremiumHeader 
        title="Settings" 
        subtitle="Manage your account and preferences"
        iosIconName="gearshape.fill"
        androidIconName="settings"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <IconSymbol
            ios_icon_name="gearshape.fill"
            android_material_icon_name="settings"
            size={64}
            color={colors.primary}
          />
          <Text style={styles.headerSectionTitle}>Settings & Preferences</Text>
          <Text style={styles.headerSectionSubtitle}>
            Manage your account, privacy, and app preferences
          </Text>
        </View>

        {/* User Info */}
        {user && (
          <View style={styles.userCard}>
            <Image
              source={{ uri: user.avatar || 'https://via.placeholder.com/60' }}
              style={styles.userAvatarImage}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.username}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        )}

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={itemIndex}>
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (!item.toggle && item.onPress) {
                        item.onPress();
                      }
                    }}
                    disabled={item.toggle}
                  >
                    <View style={styles.settingLeft}>
                      <IconSymbol
                        ios_icon_name={item.icon}
                        android_material_icon_name={item.androidIcon as any}
                        size={24}
                        color={item.danger ? colors.error : colors.text}
                      />
                      <Text style={[styles.settingLabel, item.danger && styles.settingLabelDanger]}>
                        {item.label}
                      </Text>
                    </View>
                    {item.toggle ? (
                      <Switch
                        value={item.value}
                        onValueChange={(value) => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          if (item.onToggle) item.onToggle(value);
                        }}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor="#FFFFFF"
                      />
                    ) : (
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={20}
                        color={colors.textSecondary}
                      />
                    )}
                  </TouchableOpacity>
                  {itemIndex < section.items.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol
            ios_icon_name="arrow.right.square"
            android_material_icon_name="logout"
            size={24}
            color={colors.error}
          />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>
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
    padding: spacing.md,
    paddingBottom: 120,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  headerSectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  headerSectionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: '80%',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  userAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
  },
  settingLabelDanger: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: spacing.md + 24 + spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.error}10`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  version: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
