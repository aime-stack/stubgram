
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import { useWalletStore } from '@/stores/walletStore';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PostType = 'text' | 'image' | 'video' | 'link' | 'poll';

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { addCoins } = useWalletStore();

  const [content, setContent] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [pollOptions, setPollOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPollInput, setShowPollInput] = useState(false);

  const handlePickMedia = async (type: 'image' | 'video') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'video' ? ['videos'] : ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setMediaUri(result.assets[0].uri);
        setMediaType(type);
        setShowPollInput(false); // Can't have media and poll same time usually, or just simplifying
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to pick media:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const togglePoll = () => {
    if (showPollInput) {
      setShowPollInput(false);
      setPollOptions([]);
    } else {
      setShowPollInput(true);
      setPollOptions(['', '']);
      setMediaUri(null); // Clear media if starting poll
    }
  };

  const handleCreatePost = async () => {
    if (!content.trim() && !mediaUri && pollOptions.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      // Upload media if present
      let uploadedMediaUrl: string | undefined;
      if (mediaUri) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          uploadedMediaUrl = await apiClient.uploadMedia(
            mediaUri,
            'posts',
            `${user.id}/${Date.now()}`
          );
        }
      }

      // Determine post type
      let type: PostType = 'text';
      if (uploadedMediaUrl) type = mediaType;
      else if (showPollInput) type = 'poll';
      // Basic link detection could go here too

      await apiClient.createPost({
        type,
        content: content.trim(),
        mediaUrl: uploadedMediaUrl,
        pollOptions: showPollInput ? pollOptions.filter(o => o.trim()) : undefined,
      });

      // Reward user with coins
      addCoins(10, 'Created a post');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Failed to create post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) setPollOptions([...pollOptions, '']);
  };

  const isPostDisabled = (!content.trim() && !mediaUri && !showPollInput) || isLoading;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleCreatePost}
          disabled={isPostDisabled}
          style={[styles.postButton, isPostDisabled && styles.postButtonDisabled]}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputRow}>
          <Image
            source={{ uri: user?.avatar || 'https://via.placeholder.com/50' }}
            style={styles.avatar}
          />
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="What is happening?!"
              placeholderTextColor={colors.textSecondary}
              multiline
              autoFocus
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Media Preview */}
        {mediaUri && (
          <View style={styles.mediaPreview}>
            <Image source={{ uri: mediaUri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.removeMedia} onPress={() => setMediaUri(null)}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        {/* Poll Input */}
        {showPollInput && (
          <View style={styles.pollContainer}>
            {pollOptions.map((option, index) => (
              <TextInput
                key={index}
                style={styles.pollInput}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor={colors.textSecondary}
                value={option}
                onChangeText={(text) => updatePollOption(index, text)}
              />
            ))}
            {pollOptions.length < 4 && (
              <TouchableOpacity onPress={addPollOption} style={styles.addPollOption}>
                <Text style={styles.addPollOptionText}>+ Add another option</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={togglePoll} style={styles.removePoll}>
              <Text style={styles.removePollText}>Remove Poll</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Toolbar - Fixed at bottom */}
      <View style={[styles.toolbar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity onPress={() => handlePickMedia('image')} style={styles.toolButton}>
          <IconSymbol ios_icon_name="photo" android_material_icon_name="image" size={24} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePickMedia('video')} style={styles.toolButton}>
          <IconSymbol ios_icon_name="video.fill" android_material_icon_name="videocam" size={28} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={togglePoll} style={styles.toolButton}>
          <IconSymbol ios_icon_name="chart.bar" android_material_icon_name="poll" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.characterCount}>
          <Text style={[styles.countText, content.length > 280 && { color: colors.error }]}>
            {content.length} / 280
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    padding: spacing.sm,
  },
  cancelText: {
    ...typography.body,
    color: colors.text,
  },
  postButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    opacity: 1,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
    backgroundColor: colors.border,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    ...typography.h3,
    color: colors.text,
    fontSize: 18,
    minHeight: 100,
  },
  mediaPreview: {
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  removeMedia: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
  },
  pollContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  pollInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    color: colors.text,
    ...typography.body,
  },
  addPollOption: {
    padding: spacing.sm,
  },
  addPollOptionText: {
    color: colors.primary,
    ...typography.body,
  },
  removePoll: {
    padding: spacing.sm,
    alignItems: 'center',
  },
  removePollText: {
    color: colors.error,
    ...typography.caption,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toolButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  characterCount: {
    marginLeft: 'auto',
  },
  countText: {
    ...typography.caption,
    color: colors.textSecondary,
  }
});
