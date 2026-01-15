import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { IconSymbol } from '@/components/IconSymbol';

export function HomeComposer() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const themeColors = isDark ? darkColors : lightColors;

  const handleTextPress = () => {
    router.push('/create-post');
  };

  const handleMediaPress = async (type: 'image' | 'video') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'video' ? ['videos'] : ['images'],
        quality: 0.8,
        allowsEditing: false, 
        allowsMultipleSelection: type === 'image', // Consistent with create-post rules
        selectionLimit: type === 'image' ? 10 : 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // We pass the first asset URI; create-post handles multi-select logic inside itself usually via picker, 
        // but passing one is a good start. For strict multi-file passing we'd need to update create-post params logic.
        // For now, passing the first one acts as a "start with this" intent.
        
        router.push({
            pathname: '/create-post',
            params: {
                mediaUri: result.assets[0].uri,
                mediaType: type,
                initialType: type === 'video' ? 'reel' : 'post'
            }
        });
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      {/* Input Area */}
      <View style={styles.inputRow}>
        <Image
          source={{ uri: user?.avatar || 'https://via.placeholder.com/40' }}
          style={[styles.avatar, { backgroundColor: themeColors.border }]}
        />
        <TouchableOpacity 
          style={[styles.inputButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.background }]} 
          onPress={handleTextPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.placeholderText, { color: themeColors.textSecondary }]}>
            What's on your mind, {user?.username || 'User'}?
          </Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleMediaPress('image')}>
          <IconSymbol
            ios_icon_name="photo"
            android_material_icon_name="image"
            size={20}
            color="#4CAF50" // Green for Photo
          />
          <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => handleMediaPress('video')}>
          <IconSymbol
            ios_icon_name="video.fill"
            android_material_icon_name="videocam"
            size={22}
            color="#F44336" // Red for Video
          />
          <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>Video</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleTextPress}>
          <IconSymbol
            ios_icon_name="chart.bar"
            android_material_icon_name="poll"
            size={20}
            color="#FF9800" // Orange for Poll
          />
          <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>Poll</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} disabled={true}>
          <IconSymbol
            ios_icon_name="face.smiling"
            android_material_icon_name="mood"
            size={20}
            color={colors.textSecondary} // Grey/Disabled
          />
          <Text style={[styles.actionText, { color: themeColors.textSecondary }]}>Feeling</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  inputButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 0.5,
    borderColor: 'transparent', // Can add border if needed
  },
  placeholderText: {
    ...typography.body,
    fontSize: 15,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
    opacity: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
