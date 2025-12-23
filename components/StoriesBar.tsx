
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';
import { IconSymbol } from '@/components/IconSymbol';
import { Story } from '@/types';

interface StoriesBarProps {
  stories: Story[];
  onCreateStory: () => void;
}

export function StoriesBar({ stories, onCreateStory }: StoriesBarProps) {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const themeColors = isDark ? darkColors : lightColors;

  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.userId]) {
      acc[story.userId] = [];
    }
    acc[story.userId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const userStories = Object.values(groupedStories);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Create Story Button */}
      <TouchableOpacity style={styles.storyItem} onPress={onCreateStory}>
        <View style={styles.createStoryContainer}>
          <View style={[styles.createStoryButton, { borderColor: themeColors.background }]}>
            <IconSymbol
              ios_icon_name="plus"
              android_material_icon_name="add"
              size={24}
              color="#FFFFFF"
            />
          </View>
          <Image
            source={{ uri: 'https://via.placeholder.com/60' }}
            style={[styles.storyAvatar, { backgroundColor: themeColors.border }]}
          />
        </View>
        <Text style={[styles.storyUsername, { color: themeColors.text }]}>Your Story</Text>
      </TouchableOpacity>

      {/* User Stories */}
      {userStories.map((userStoryGroup, index) => {
        const firstStory = userStoryGroup[0];
        if (!firstStory) return null;

        const hasUnviewed = userStoryGroup.some(s => !s.isViewed);
        const user = firstStory.user || { avatar: undefined, username: 'User' };

        return (
          <TouchableOpacity
            key={index}
            style={styles.storyItem}
            onPress={() => router.push(`/stories/${firstStory.userId}`)}
          >
            <LinearGradient
              colors={hasUnviewed ? [colors.primary, colors.secondary] : [themeColors.border, themeColors.border]}
              style={styles.storyGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.storyAvatarContainer, { borderColor: themeColors.background }]}>
                <Image
                  source={{ uri: user.avatar || 'https://via.placeholder.com/60' }}
                  style={[styles.storyAvatar, { backgroundColor: themeColors.border }]}
                />
              </View>
            </LinearGradient>
            <Text style={[styles.storyUsername, { color: themeColors.text }]} numberOfLines={1}>
              {user.username || 'User'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  storyItem: {
    alignItems: 'center',
    width: 70,
  },
  createStoryContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    marginBottom: spacing.xs,
  },
  createStoryButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
    zIndex: 1,
  },
  storyGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    padding: 2,
  },
  storyAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.background,
    overflow: 'hidden',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
  },
  storyUsername: {
    ...typography.small,
    color: colors.text,
    textAlign: 'center',
  },
});
