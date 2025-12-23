
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { balance } = useWalletStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Cover Photo */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={styles.coverPhoto}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: user.avatar || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          {user.isVerified && (
            <View style={styles.verifiedBadge}>
              <IconSymbol
                ios_icon_name="checkmark.seal.fill"
                android_material_icon_name="verified"
                size={24}
                color={colors.primary}
              />
            </View>
          )}
        </View>
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={styles.username}>{user.username}</Text>
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.postsCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Coin Balance Card */}
      <View style={styles.coinCard}>
        <View style={styles.coinHeader}>
          <IconSymbol
            ios_icon_name="dollarsign.circle.fill"
            android_material_icon_name="monetization-on"
            size={32}
            color={colors.accent}
          />
          <View style={styles.coinInfo}>
            <Text style={styles.coinLabel}>Snap Coins</Text>
            <Text style={styles.coinBalance}>{balance.toLocaleString()}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.viewWalletButton}
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <Text style={styles.viewWalletText}>View Wallet</Text>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol
            ios_icon_name="bookmark.fill"
            android_material_icon_name="bookmark"
            size={24}
            color={colors.text}
          />
          <Text style={styles.menuText}>Saved Posts</Text>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={20}
            color={colors.textSecondary}
            style={styles.menuChevron}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/courses?tab=enrolled')}
        >
          <IconSymbol
            ios_icon_name="book.fill"
            android_material_icon_name="school"
            size={24}
            color={colors.text}
          />
          <Text style={styles.menuText}>My Courses</Text>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={20}
            color={colors.textSecondary}
            style={styles.menuChevron}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol
            ios_icon_name="gear"
            android_material_icon_name="settings"
            size={24}
            color={colors.text}
          />
          <Text style={styles.menuText}>Settings</Text>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={20}
            color={colors.textSecondary}
            style={styles.menuChevron}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol
            ios_icon_name="questionmark.circle"
            android_material_icon_name="help"
            size={24}
            color={colors.text}
          />
          <Text style={styles.menuText}>Help & Support</Text>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={20}
            color={colors.textSecondary}
            style={styles.menuChevron}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem]}
          onPress={handleLogout}
          disabled={isLoading}
        >
          <IconSymbol
            ios_icon_name="arrow.right.square"
            android_material_icon_name="logout"
            size={24}
            color={colors.error}
          />
          <Text style={[styles.menuText, styles.logoutText]}>
            {isLoading ? 'Logging out...' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: 150,
  },
  avatarContainer: {
    position: 'absolute',
    bottom: -50,
    left: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: colors.background,
    backgroundColor: colors.border,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 2,
  },
  userInfo: {
    padding: spacing.lg,
    paddingTop: spacing.xxl + 10,
  },
  username: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bio: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.divider,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  editButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  coinCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  coinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  coinInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  coinLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  coinBalance: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  viewWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  viewWalletText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  menu: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  menuText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.md,
    flex: 1,
  },
  menuChevron: {
    marginLeft: 'auto',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: colors.error,
  },
});
