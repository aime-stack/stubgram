
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
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  const params = useLocalSearchParams<{ mediaUri?: string; mediaType?: 'image' | 'video'; communityId?: string; initialType?: 'post' | 'reel' }>();

  const [postType, setPostType] = useState<'post' | 'reel'>(params.initialType || 'post');
  const [content, setContent] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  useEffect(() => {
    if (params.mediaUri) {
        setMediaUri(params.mediaUri);
        if (params.mediaType) {
            setMediaType(params.mediaType);
            if (params.mediaType === 'video') {
                setPostType('reel');
            }
        }
    }
  }, [params.mediaUri, params.mediaType]);
  const [pollOptions, setPollOptions] = useState<string[]>([]);
  const [feeling, setFeeling] = useState<string | undefined>(undefined);
  const [showFeelingSelector, setShowFeelingSelector] = useState(false);
  const FEELINGS = ['😊 Happy', '😔 Sad', '🎉 Excited', '😴 Tired', '🤔 Thinking', '❤️ Loved', '😡 Angry', '🤢 Sick'];
  const [isLoading, setIsLoading] = useState(false);
  const [showPollInput, setShowPollInput] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [linkMetadata, setLinkMetadata] = useState<any>(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex);
    
    if (urls && urls.length > 0 && !linkMetadata && !isFetchingMetadata && !mediaUri) {
        const fetchMetadata = async () => {
            setIsFetchingMetadata(true);
            try {
                const metadata = await apiClient.fetchLinkMetadata(urls[0]);
                // Only set metadata if extraction was successful or partial
                if (metadata && metadata.status !== 'failed') {
                    setLinkMetadata(metadata);
                } else {
                    console.log('Link metadata extraction failed:', metadata?.error);
                    // Don't set metadata - show nothing instead of broken preview
                }
            } catch (error) {
                console.error('Failed to fetch link metadata:', error);
            } finally {
                setIsFetchingMetadata(false);
            }
        };
        fetchMetadata();
    }
  }, [content, linkMetadata, isFetchingMetadata, mediaUri]);


  const [aspectRatio, setAspectRatio] = useState(1.0);

  // Multi-media state
  const [selectedMedia, setSelectedMedia] = useState<Array<{ uri: string; type: 'image' | 'video'; aspectRatio: number }>>([]);

  const handlePickMedia = async (type: 'image' | 'video') => {
    try {
      const isPost = postType === 'post';
      // Enable multi-selection for images in Posts
      const allowsMultiple = isPost && type === 'image'; 

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'video' ? ['videos'] : ['images'],
        quality: 0.8,
        allowsEditing: false, 
        allowsMultipleSelection: allowsMultiple,
        selectionLimit: allowsMultiple ? 10 : 1,
      });

      if (!result.canceled) {
        if (allowsMultiple) {
            // Process multiple assets
            const newMedia = result.assets.map(asset => ({
                uri: asset.uri,
                type: type,
                aspectRatio: (asset.width && asset.height) ? asset.width / asset.height : 1.0
            }));
            setSelectedMedia(newMedia);
            setMediaUri(newMedia[0].uri); // Preview first item
            setMediaType(type);
             // Use first item's aspect ratio for main container preview
            setAspectRatio(newMedia[0].aspectRatio);
        } else {
            // Single asset (legacy / video mode)
            const asset = result.assets[0];
            const ratio = (asset.width && asset.height) ? asset.width / asset.height : 1.0;
            
             // Validate constraints
            const MAX_SIZE_MB = 100;
            if (asset.fileSize && asset.fileSize > MAX_SIZE_MB * 1024 * 1024) {
                 Alert.alert('File too large', `Video must be under ${MAX_SIZE_MB}MB`);
                 return;
            }

            setMediaUri(asset.uri);
            setMediaType(type);
            setAspectRatio(ratio);
            setSelectedMedia([{ uri: asset.uri, type, aspectRatio: ratio }]);
        }

        setShowPollInput(false);
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
      setMediaUri(null);
      setPostType('post'); // Polls are only for posts
    }
  };

  const toggleFeeling = () => {
    setShowFeelingSelector(!showFeelingSelector);
  };

  const selectFeeling = (f: string) => {
    setFeeling(f);
    setShowFeelingSelector(false);
  };

  const handleCreatePost = async () => {
    if (!content.trim() && !mediaUri && pollOptions.length === 0) {
      return;
    }

    if (postType === 'reel' && (!mediaUri || mediaType !== 'video')) {
      Alert.alert('Error', 'Reels must include a video');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let uploadedMediaUrls: Array<{ url: string; type: 'image' | 'video'; aspectRatio: number }> = [];
      let primaryMediaUrl: string | undefined;

      // Handle Carousel / Multiple Media
      if (selectedMedia.length > 0) {
          const total = selectedMedia.length;
          let completed = 0;

          for (const item of selectedMedia) {
              const uploadedUrl = await apiClient.uploadMediaWithProgress(
                item.uri,
                postType === 'reel' ? 'reels' : 'posts',
                `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}`,
                (progress) => {
                     // Approximate total progress
                     setUploadProgress(Math.round(((completed + (progress / 100)) / total) * 90));
                }
              );
              uploadedMediaUrls.push({
                  url: uploadedUrl,
                  type: item.type,
                  aspectRatio: item.aspectRatio
              });
              completed++;
          }
          primaryMediaUrl = uploadedMediaUrls[0].url;
      } 
      // Legacy / Single Media Fallback (if selectedMedia wasn't populated properly but mediaUri was)
      else if (mediaUri) {
          setUploadProgress(10);
          primaryMediaUrl = await apiClient.uploadMediaWithProgress(
            mediaUri,
            postType === 'reel' ? 'reels' : 'posts',
            `${user.id}/${Date.now()}`,
            (progress) => setUploadProgress(progress)
          );
      }

      // Determine final type
      let type: 'post' | 'reel' | 'poll' = postType;
      if (showPollInput) type = 'poll';

      setUploadProgress(95);
      await apiClient.createPost({
        type,
        content: content.trim(),
        mediaUrl: primaryMediaUrl, // Legacy support for primary image
        mediaUrls: uploadedMediaUrls.length > 0 ? uploadedMediaUrls : undefined, // V2 Carousel
        linkUrl: linkMetadata?.url,
        linkMetadata: linkMetadata,
        pollOptions: showPollInput ? pollOptions.filter(o => o.trim()) : undefined,
        communityId: params.communityId,
        aspectRatio: aspectRatio,
        originalMetadata: { width: aspectRatio * 100, height: 100 },
        feeling: feeling,
      });

      // V2: Points handled by backend. We just notify user.
      addCoins(postType === 'reel' ? 5 : 2, 'Post Created', true);

      setUploadProgress(100);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (error) {
      console.error('Failed to create post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
      setUploadProgress(0);
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#FFF" size="small" />
              {uploadProgress > 0 && (
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>
                  {uploadProgress}%
                </Text>
              )}
            </View>
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
        {/* Type Selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, postType === 'post' && styles.typeButtonActive]}
            onPress={() => {
              setPostType('post');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[styles.typeButtonText, postType === 'post' && styles.typeButtonActiveText]}>Post</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, postType === 'reel' && styles.typeButtonActive]}
            onPress={() => {
              setPostType('reel');
              setShowPollInput(false);
              setPollOptions([]);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[styles.typeButtonText, postType === 'reel' && styles.typeButtonActiveText]}>Reel</Text>
          </TouchableOpacity>
        </View>
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
              onChangeText={setContent}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Feeling Display/Selector */}
         {feeling && (
             <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
                 <Text style={{ fontSize: 14, color: colors.text }}>is feeling {feeling}</Text>
                 <TouchableOpacity onPress={() => setFeeling(undefined)} style={{ marginLeft: 8 }}>
                     <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={16} color={colors.textSecondary} />
                 </TouchableOpacity>
             </View>
         )}

         {showFeelingSelector && (
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}>
                 {FEELINGS.map(f => (
                     <TouchableOpacity
                        key={f}
                        style={{ 
                            backgroundColor: colors.card, 
                            paddingHorizontal: 12, 
                            paddingVertical: 6, 
                            borderRadius: 16, 
                            marginRight: 8,
                            borderWidth: 1,
                            borderColor: colors.border
                        }}
                        onPress={() => selectFeeling(f)}
                     >
                         <Text style={{ fontSize: 13, color: colors.text }}>{f}</Text>
                     </TouchableOpacity>
                 ))}
             </ScrollView>
         )}

        {/* Media Preview */}
        {selectedMedia.length > 0 ? (
           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselPreview} contentContainerStyle={{ paddingRight: 20 }}>
               {selectedMedia.map((item, index) => (
                   <View key={index} style={styles.carouselItem}>
                       <Image source={{ uri: item.uri }} style={styles.carouselImage} />
                       <TouchableOpacity 
                            style={styles.removeMedia} 
                            onPress={() => {
                                const newMedia = selectedMedia.filter((_, i) => i !== index);
                                setSelectedMedia(newMedia);
                                if (newMedia.length === 0) {
                                    setMediaUri(null);
                                    setAspectRatio(1.0);
                                } else {
                                    setMediaUri(newMedia[0].uri);
                                }
                            }}
                        >
                            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color="#000" />
                       </TouchableOpacity>
                   </View>
               ))}
           </ScrollView>
        ) : (mediaUri && (
           <View style={styles.mediaPreview}>
            <Image source={{ uri: mediaUri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.removeMedia} onPress={() => { setMediaUri(null); setMediaType('image'); }}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Link Preview */}
        {linkMetadata && (
          <View style={styles.linkPreviewContainer}>
            {linkMetadata.image && (
                <Image source={{ uri: linkMetadata.image }} style={styles.linkImage} />
            )}
            <View style={styles.linkInfo}>
                <Text style={styles.linkTitle} numberOfLines={1}>{linkMetadata.title}</Text>
                <Text style={styles.linkDescription} numberOfLines={2}>{linkMetadata.description}</Text>
                <Text style={styles.linkDomain}>{linkMetadata.domain}</Text>
            </View>
            <TouchableOpacity style={styles.removeLink} onPress={() => setLinkMetadata(null)}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {isFetchingMetadata && (
            <View style={styles.fetchingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.fetchingText}>Fetching link details...</Text>
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
          <IconSymbol ios_icon_name="chart.bar" android_material_icon_name="poll" size={24} color={showPollInput ? colors.primary : colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleFeeling} style={styles.toolButton}>
          <IconSymbol ios_icon_name="face.smiling" android_material_icon_name="mood" size={24} color={feeling ? colors.primary : colors.text} />
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
  },
  typeSelector: {
    flexDirection: 'row',
    margin: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
  },
  typeButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeButtonActiveText: {
    color: '#FFF',
  },
  linkPreviewContainer: {
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
    position: 'relative',
    backgroundColor: colors.card,
  },
  linkImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.border,
  },
  linkInfo: {
    padding: spacing.sm,
  },
  linkTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  linkDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  linkDomain: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 4,
    textTransform: 'lowercase',
  },
  removeLink: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    padding: 2,
  },
  fetchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  fetchingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  carouselPreview: {
    paddingLeft: spacing.md,
    marginBottom: spacing.md,
  },
  carouselItem: {
      width: 200,
      height: 250,
      marginRight: spacing.sm,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      position: 'relative',
  },
  carouselImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
  },
});
