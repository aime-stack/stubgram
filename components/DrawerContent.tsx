import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Switch } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/styles/commonStyles';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';

export function DrawerContent(props: any) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuthStore();
    const { balance } = useWalletStore();
    const { isDark } = useThemeStore();

    // Use dynamic colors based on theme
    const colors = isDark ? darkColors : lightColors;

    const handleNavigation = (route: string) => {
        router.push(route as any);
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <DrawerContentScrollView
                {...props}
                contentContainerStyle={{ paddingTop: 0 }}
                style={{ backgroundColor: colors.background }}
            >
                {/* Header / User Info */}
                <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                    <TouchableOpacity onPress={() => handleNavigation('/(tabs)/profile')}>
                        <Image
                            source={{ uri: user?.avatar || 'https://via.placeholder.com/100' }}
                            style={[styles.avatar, { backgroundColor: colors.border }]}
                        />
                    </TouchableOpacity>
                    <View style={styles.userInfo}>
                        <Text style={[styles.name, { color: colors.text }]}>{user?.username || 'User'}</Text>
                        <Text style={[styles.handle, { color: colors.textSecondary }]}>@{user?.username?.toLowerCase() || 'handle'}</Text>
                    </View>

                    <View style={styles.statsRow}>
                        <TouchableOpacity style={styles.stat}>
                            <Text style={[styles.statNumber, { color: colors.text }]}>{user?.followingCount || 0}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.stat}>
                            <Text style={[styles.statNumber, { color: colors.text }]}>{user?.followersCount || 0}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Wallet Balance */}
                    <View style={[styles.walletBadge, { backgroundColor: colors.card }]}>
                        <Text style={[styles.walletText, { color: colors.primary }]}>{balance.toLocaleString()} 🪙</Text>
                    </View>
                </View>

                <View style={[styles.separator, { backgroundColor: colors.border }]} />

                {/* Main Menu Items */}
                <View style={styles.menuItems}>
                    <DrawerItem
                        label="Profile"
                        labelStyle={[styles.drawerLabel, { color: colors.text }]}
                        icon={({ color, size }) => (
                            <IconSymbol ios_icon_name="person" android_material_icon_name="person" size={24} color={colors.text} />
                        )}
                        onPress={() => handleNavigation('/(tabs)/profile')}
                    />

                    <DrawerItem
                        label="Premium Plans"
                        labelStyle={[styles.drawerLabel, { color: colors.text }]}
                        icon={({ color, size }) => (
                            <IconSymbol ios_icon_name="crown.fill" android_material_icon_name="stars" size={24} color="#FFD700" />
                        )}
                        onPress={() => handleNavigation('/premium')}
                    />

                    <DrawerItem
                        label="VIP Celebrity Chat"
                        labelStyle={[styles.drawerLabel, { color: colors.text }]}
                        icon={({ color, size }) => (
                            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={24} color="#FF69B4" />
                        )}
                        onPress={() => handleNavigation('/celebrities')}
                    />

                    <DrawerItem
                        label="Video Spaces"
                        labelStyle={[styles.drawerLabel, { color: colors.text }]}
                        icon={({ color, size }) => (
                            <IconSymbol ios_icon_name="video.fill" android_material_icon_name="videocam" size={24} color="#4CAF50" />
                        )}
                        onPress={() => handleNavigation('/spaces')}
                    />

                    <DrawerItem
                        label="Advertising"
                        labelStyle={[styles.drawerLabel, { color: colors.text }]}
                        icon={({ color, size }) => (
                            <IconSymbol ios_icon_name="megaphone.fill" android_material_icon_name="campaign" size={24} color="#FF6B35" />
                        )}
                        onPress={() => handleNavigation('/ads')}
                    />

                    <DrawerItem
                        label="Courses"
                        labelStyle={[styles.drawerLabel, { color: colors.text }]}
                        icon={({ color, size }) => (
                            <IconSymbol ios_icon_name="book.fill" android_material_icon_name="menu-book" size={24} color={colors.text} />
                        )}
                        onPress={() => handleNavigation('/courses')}
                    />

                    <DrawerItem
                        label="Wallet"
                        labelStyle={[styles.drawerLabel, { color: colors.text }]}
                        icon={({ color, size }) => (
                            <IconSymbol ios_icon_name="wallet.pass.fill" android_material_icon_name="account-balance-wallet" size={24} color={colors.text} />
                        )}
                        onPress={() => handleNavigation('/(tabs)/wallet')}
                    />

                    <DrawerItem
                        label="Become a Teacher"
                        labelStyle={[styles.drawerLabel, { color: colors.text }]}
                        icon={({ color, size }) => (
                            <IconSymbol ios_icon_name="graduationcap" android_material_icon_name="school" size={24} color={colors.text} />
                        )}
                        onPress={() => handleNavigation('/become-teacher')}
                    />

                    <DrawerItem
                        label="Settings"
                        labelStyle={[styles.drawerLabel, { color: colors.text }]}
                        icon={({ color, size }) => (
                            <IconSymbol ios_icon_name="gear" android_material_icon_name="settings" size={24} color={colors.text} />
                        )}
                        onPress={() => handleNavigation('/settings')}
                    />

                    <DrawerItem
                        label="Support"
                        labelStyle={[styles.drawerLabel, { color: colors.text }]}
                        icon={({ color, size }) => (
                            <IconSymbol ios_icon_name="questionmark.circle" android_material_icon_name="help-outline" size={24} color={colors.text} />
                        )}
                        onPress={() => handleNavigation('/support')}
                    />
                </View>
            </DrawerContentScrollView>

            {/* Footer with Logout */}
            <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + spacing.md }]}>
                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <IconSymbol ios_icon_name="rectangle.portrait.and.arrow.right" android_material_icon_name="logout" size={22} color={colors.error} />
                    <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginBottom: spacing.sm,
    },
    userInfo: {
        marginBottom: spacing.md,
    },
    name: {
        ...typography.h3,
    },
    handle: {
        ...typography.body,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginBottom: spacing.sm,
    },
    stat: {
        flexDirection: 'row',
        gap: 4,
    },
    statNumber: {
        ...typography.body,
        fontWeight: '700',
    },
    statLabel: {
        ...typography.body,
    },
    walletBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
    },
    walletText: {
        ...typography.body,
        fontWeight: '600',
    },
    separator: {
        height: 1,
        marginVertical: spacing.xs,
    },
    menuItems: {
        paddingVertical: spacing.sm,
    },
    drawerLabel: {
        ...typography.h3,
        fontSize: 18,
        marginLeft: -10,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: spacing.lg,
        borderTopWidth: 1,
        paddingTop: spacing.md,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    logoutText: {
        ...typography.body,
        fontWeight: '600',
    },
});
