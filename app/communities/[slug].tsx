import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import { Community, CommunityMember } from '@/types/community';
import { Post } from '@/types';
import { PostCard } from '@/components/PostCard';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';
import * as Haptics from 'expo-haptics';

export default function CommunityDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const themeColors = isDark ? darkColors : lightColors;
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'members'>('posts');
  const [isJoining, setIsJoining] = useState(false);

  const loadCommunityData = async (refresh = false) => {
    if (!slug) return;

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // 1. Fetch community details first to get the ID
      const { data: communityData } = await apiClient.getCommunityBySlug(slug);
      
      if (!communityData) {
        throw new Error('Community not found');
      }

      setCommunity(communityData);

      // 2. Fetch posts and members using the valid ID
      const [postsRes, membersRes] = await Promise.all([
        apiClient.getCommunityPosts(communityData.id),
        apiClient.getCommunityMembers(communityData.id),
      ]);

      setPosts(postsRes.data || []);
      setMembers(membersRes.data || []);

    } catch (error) {
      console.error('Failed to load community:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);

    }
  };

  useEffect(() => {
    loadCommunityData();
  }, [slug]);

  const handleJoinLeave = async () => {
    if (!community) return;

    setIsJoining(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (community.isMember) {
        await apiClient.leaveCommunity(community.id);
      } else {
        await apiClient.joinCommunity(community.id);
      }
      await loadCommunityData(true);
    } catch (error) {
      console.error('Failed to join/leave community:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const renderHeader = () => {
    if (!community) return null;

    return (
      <View style={[styles.headerContainer, { backgroundColor: themeColors.background }]}>
        {/* Cover Image Placeholder */}
        <View style={[styles.coverImage, { backgroundColor: themeColors.border }]}>
          {community.coverUrl && (
            <Image source={{ uri: community.coverUrl }} style={StyleSheet.absoluteFill} />
          )}
        </View>

        {/* Community Info */}
        <View style={styles.communityInfo}>
          <Image
            source={{ uri: community.avatarUrl || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <View style={styles.infoContent}>
            <View style={styles.titleRow}>
              <Text style={[styles.communityName, { color: themeColors.text }]}>{community.name}</Text>
              {community.isPrivate && (
                <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={18} color={themeColors.textSecondary} />
              )}
            </View>
            {community.description && (
              <Text style={[styles.description, { color: themeColors.textSecondary }]}>{community.description}</Text>
            )}

            {/* Stats */}
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: themeColors.text }]}>{community.membersCount}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Members</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: themeColors.text }]}>{community.postsCount}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Posts</Text>
              </View>
            </View>

            {/* Join/Leave Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                community.isMember 
                  ? { backgroundColor: themeColors.border } 
                  : { backgroundColor: themeColors.primary }
              ]}
              onPress={handleJoinLeave}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator color={community.isMember ? themeColors.text : '#FFF'} size="small" />
              ) : (
                <>
                  <IconSymbol 
                    ios_icon_name={community.isMember ? "checkmark" : "plus"} 
                    android_material_icon_name={community.isMember ? "check" : "add"} 
                    size={20} 
                    color={community.isMember ? themeColors.text : '#FFF'} 
                  />
                  <Text style={[styles.actionButtonText, { color: community.isMember ? themeColors.text : '#FFF' }]}>
                    {community.isMember ? 'Joined' : 'Join Community'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, { color: themeColors.text }, activeTab === 'posts' && { color: themeColors.primary }]}>
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.activeTab]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, { color: themeColors.text }, activeTab === 'members' && { color: themeColors.primary }]}>
              Members
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMemberItem = ({ item }: { item: CommunityMember }) => (
    <TouchableOpacity
      style={[styles.memberCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
      onPress={() => router.push(`/user/${item.userId}`)}
    >
      <Image
        source={{ uri: item.user.avatar || 'https://via.placeholder.com/50' }}
        style={styles.memberAvatar}
      />
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: themeColors.text }]}>@{item.user.username}</Text>
        <View style={styles.memberMeta}>
          <View style={[styles.roleBadge, { backgroundColor: item.role === 'admin' ? '#FFD60A20' : themeColors.border }]}>
            <Text style={[styles.roleText, { color: item.role === 'admin' ? '#FFD60A' : themeColors.textSecondary }]}>
              {item.role}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading || !community) {
    return (
      <View style={[styles.centered, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      {/* Header with back button */}
      <View style={[styles.topBar, { backgroundColor: themeColors.background, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: themeColors.text }]} numberOfLines={1}>
          {community.name}
        </Text>
        <TouchableOpacity 
            onPress={() => router.push({ pathname: '/create-post', params: { communityId: community.id } })} 
            style={styles.backButton}
        >
            <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      {activeTab === 'posts' ? (
        <FlatList
          data={posts}
          renderItem={({ item }) => <PostCard post={item} />}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol 
                ios_icon_name="doc.text" 
                android_material_icon_name="article" 
                size={64} 
                color={themeColors.textSecondary} 
              />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                No posts yet
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadCommunityData(true)}
              tintColor={themeColors.primary}
            />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      ) : (
        <FlatList
          data={members}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol 
                ios_icon_name="person.2" 
                android_material_icon_name="people" 
                size={64} 
                color={themeColors.textSecondary} 
              />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                No members yet
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadCommunityData(true)}
              tintColor={themeColors.primary}
            />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  topBarTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    marginBottom: spacing.md,
  },
  coverImage: {
    height: 120,
  },
  communityInfo: {
    padding: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFF',
    marginTop: -40,
    backgroundColor: colors.border,
  },
  infoContent: {
    marginTop: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  communityName: {
    ...typography.h3,
    fontWeight: '700',
  },
  description: {
    ...typography.body,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    fontWeight: '700',
    fontSize: 20,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  actionButtonText: {
    ...typography.body,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
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
  memberCard: {
    flexDirection: 'row',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.border,
  },
  memberInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  memberName: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roleText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
  },
});
