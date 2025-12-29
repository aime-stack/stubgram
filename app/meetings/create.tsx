import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

export default function CreateMeetingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a meeting title');
      return;
    }

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: meeting } = await apiClient.createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        type: isPrivate ? 'private' : 'public',
        password: password.trim() || undefined,
      });

      // Copy meeting code to clipboard
      await Clipboard.setStringAsync(meeting.meetingId);

      Alert.alert(
        'Meeting Created!',
        `Meeting Code: ${meeting.meetingId}\n\nThe code has been copied to your clipboard.`,
        [
          {
            text: 'Start Meeting',
            onPress: () => router.push(`/meetings/${meeting.meetingId}`),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to create meeting:', error);
      Alert.alert('Error', error.message || 'Failed to create meeting');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.content, { paddingTop: insets.top + spacing.xl }]}>
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <IconSymbol ios_icon_name="plus.video.fill" android_material_icon_name="video-call" size={48} color="#FFF" />
            </View>
            <Text style={styles.title}>Create Meeting</Text>
            <Text style={styles.subtitle}>Set up your meeting details</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <IconSymbol ios_icon_name="text.justify" android_material_icon_name="title" size={20} color="#667eea" />
              <TextInput
                style={styles.input}
                placeholder="Meeting Title"
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={title}
                onChangeText={setTitle}
                editable={!isCreating}
                maxLength={100}
              />
            </View>

            <View style={[styles.inputContainer, styles.textArea]}>
              <IconSymbol ios_icon_name="doc.text" android_material_icon_name="description" size={20} color="#667eea" />
              <TextInput
                style={[styles.input, styles.textAreaInput]}
                placeholder="Description (optional)"
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                editable={!isCreating}
                maxLength={500}
              />
            </View>

            {/* Privacy Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <IconSymbol ios_icon_name={isPrivate ? "lock.fill" : "lock.open.fill"} android_material_icon_name={isPrivate ? "lock" : "lock-open"} size={20} color="#FFF" />
                <Text style={styles.settingLabel}>Private Meeting</Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                disabled={isCreating}
                trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#FF3B30' }}
                thumbColor="#FFF"
              />
            </View>

            {/* Password (if private) */}
            {isPrivate && (
              <View style={styles.inputContainer}>
                <IconSymbol ios_icon_name="key.fill" android_material_icon_name="vpn-key" size={20} color="#667eea" />
                <TextInput
                  style={styles.input}
                  placeholder="Password (optional)"
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isCreating}
                  maxLength={50}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add-circle" size={24} color="#FFF" />
                  <Text style={styles.createButtonText}>Create Meeting</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: '#FFF',
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  textArea: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
    color: '#000',
  },
  textAreaInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingLabel: {
    ...typography.body,
    color: '#FFF',
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    ...typography.body,
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
