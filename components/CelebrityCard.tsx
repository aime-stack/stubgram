import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { User } from '@/types';

interface CelebrityCardProps {
  user: User;
}

export function CelebrityCard({ user }: CelebrityCardProps) {
  const router = useRouter();

  // Determine status color
  const getStatusColor = () => {
    if (user.isOnline) return '#4CAF50'; // Green
    // We could add 'busy' logic here if we had a specific flag
    return '#9E9E9E'; // Gray/Offline
  };

  const handleChat = () => {
    router.push(`/celebrity-chat/${user.id}` as any);
  };

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={handleChat}
      activeOpacity={0.9}
    >
      {/* Avatar Section */}
      <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: user.avatar || 'https://via.placeholder.com/60' }} 
            style={styles.avatar} 
          />
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{user.full_name || user.username}</Text>
          {user.isVerified && (
            <IconSymbol
              ios_icon_name="checkmark.seal.fill"
              android_material_icon_name="verified"
              size={14}
              color={colors.primary}
            />
          )}
        </View>
        
        <Text style={styles.role} numberOfLines={1}>
          {user.category || 'Influencer'}
        </Text>
        
        <Text style={styles.bio} numberOfLines={1}>
          {user.bio || 'Available for chat'}
        </Text>

        <View style={styles.statsRow}>
            {user.rating && (
                <View style={styles.stat}>
                    <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={12} color="#FFD700" />
                    <Text style={styles.statText}>{user.rating}</Text>
                </View>
            )}
            <View style={styles.dotSeparator} />
            <Text style={styles.statText}>{user.followersCount > 1000 ? `${(user.followersCount/1000).toFixed(1)}k` : user.followersCount} followers</Text>
        </View>
      </View>

      {/* Action Section */}
      <View style={styles.actionContainer}>
        <Text style={styles.priceLabel}>/msg</Text>
        <Text style={styles.price}>{user.messagePrice || 500} 🪙</Text>
        
        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.border,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.card,
  },
  infoContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  name: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    fontSize: 16,
  },
  role: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  bio: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
  },
  actionContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  price: {
    ...typography.body,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chatButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  chatButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
