import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import { Community } from '@/types/community';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';

export default function CommunitiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const themeColors = isDark ? darkColors : lightColors;
  
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'joined'>('public');

  const loadCommunities = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const { data } = await apiClient.getCommunities(activeTab);
      setCommunities(data);
    } catch (error) {
      console.error('Failed to load communities:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCommunities();
  }, [activeTab]);

  const handleJoinCommunity = async (communityId: string) => {
    try {
      await apiClient.joinCommunity(communityId);
      loadCommunities(true);
    } catch (error) {
      console.error('Failed to join community:', error);
    }
  };

  const renderCommunityCard = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={[styles.communityCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
      onPress={() => router.push({ pathname: '/communities/[slug]' as any, params: { slug: item.slug } })}
    >
      <Image
        source={{ uri: item.avatarUrl || 'https://via.placeholder.com/80' }}
        style={styles.communityAvatar}
      />
      <View style={styles.communityInfo}>
        <View style={styles.communityHeader}>
          <Text style={[styles.communityName, { color: themeColors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.isPrivate && (
            <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={14} color={themeColors.textSecondary} />
          )}
        </View>
        {item.description && (
          <Text style={[styles.communityDescription, { color: themeColors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.communityMeta}>
          <View style={styles.metaItem}>
            <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={14} color={themeColors.textSecondary} />
            <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
              {item.membersCount} {item.membersCount === 1 ? 'member' : 'members'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <IconSymbol ios_icon_name="doc.text.fill" android_material_icon_name="article" size={14} color={themeColors.textSecondary} />
            <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
              {item.postsCount} {item.postsCount === 1 ? 'post' : 'posts'}
            </Text>
          </View>
        </View>
      </View>
      {!item.isMember && (
        <TouchableOpacity
          style={[styles.joinButton, { backgroundColor: themeColors.primary }]}
          onPress={(e) => {
            e.stopPropagation();
            handleJoinCommunity(item.id);
          }}
        >
          <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={16} color="#FFF" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: themeColors.background, borderBottomColor: themeColors.border }]}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Communities</Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: themeColors.primary }]}
          onPress={() => router.push('/communities/create' as any)}
        >
          <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add-circle" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: themeColors.background, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'public' && styles.activeTab]}
          onPress={() => setActiveTab('public')}
        >
          <Text style={[styles.tabText, { color: themeColors.text }, activeTab === 'public' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'joined' && styles.activeTab]}
          onPress={() => setActiveTab('joined')}
        >
          <Text style={[styles.tabText, { color: themeColors.text }, activeTab === 'joined' && styles.activeTabText]}>
            My Communities
          </Text>
        </TouchableOpacity>
      </View>

      {/* Communities List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <FlatList
          data={communities}
          renderItem={renderCommunityCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadCommunities(true)}
              tintColor={themeColors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="person.3" android_material_icon_name="groups" size={64} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                {activeTab === 'public' ? 'No communities yet' : 'You haven\'t joined any communities'}
              </Text>
              {activeTab === 'joined' && (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: themeColors.primary }]}
                  onPress={() => setActiveTab('public')}
                >
                  <Text style={styles.emptyButtonText}>Discover Communities</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.h2,
    fontWeight: '700',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
  list: {
    padding: spacing.md,
  },
  communityCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  communityAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.border,
  },
  communityInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  communityName: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
  },
  communityDescription: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  communityMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    fontSize: 12,
  },
  joinButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  emptyButtonText: {
    ...typography.body,
    color: '#FFF',
    fontWeight: '600',
  },
});
