import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import * as Haptics from 'expo-haptics';

export default function JoinMeetingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [meetingCode, setMeetingCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    if (!meetingCode.trim()) {
      Alert.alert('Error', 'Please enter a meeting code');
      return;
    }

    setIsJoining(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // First, get the meeting details to check if password is required
      const { data: meeting } = await apiClient.getMeetingByCode(meetingCode.trim().toUpperCase(), password || undefined);

      // Join the meeting
      await apiClient.joinMeeting(meetingCode.trim().toUpperCase());

      // Navigate to the meeting room
      router.push(`/meetings/${meeting.meetingId}`);
    } catch (error: any) {
      console.error('Failed to join meeting:', error);
      
      if (error.message === 'Invalid password') {
        setShowPassword(true);
        Alert.alert('Password Required', 'This meeting is password protected');
      } else if (error.message === 'Meeting not found') {
        Alert.alert('Meeting Not Found', 'Please check the meeting code and try again');
      } else {
        Alert.alert('Error', error.message || 'Failed to join meeting');
      }
    } finally {
      setIsJoining(false);
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
              <IconSymbol ios_icon_name="video.fill" android_material_icon_name="videocam" size={48} color="#FFF" />
            </View>
            <Text style={styles.title}>Join Meeting</Text>
            <Text style={styles.subtitle}>Enter the meeting code to join</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <IconSymbol ios_icon_name="number" android_material_icon_name="tag" size={20} color="#667eea" />
              <TextInput
                style={styles.input}
                placeholder="Meeting Code"
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={meetingCode}
                onChangeText={(text) => setMeetingCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={10}
                editable={!isJoining}
              />
            </View>

            {showPassword && (
              <View style={styles.inputContainer}>
                <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={20} color="#667eea" />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isJoining}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.joinButton, isJoining && styles.joinButtonDisabled]}
              onPress={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <IconSymbol ios_icon_name="arrow.right.circle.fill" android_material_icon_name="arrow-forward" size={24} color="#FFF" />
                  <Text style={styles.joinButtonText}>Join Meeting</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push('/meetings/create')}
            >
              <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add-circle" size={20} color="#FFF" />
              <Text style={styles.quickActionText}>Create Meeting</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.back()}
            >
              <IconSymbol ios_icon_name="list.bullet" android_material_icon_name="list" size={20} color="#FFF" />
              <Text style={styles.quickActionText}>Go Back</Text>
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
  input: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
    color: '#000',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    ...typography.body,
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  quickActionText: {
    ...typography.caption,
    color: '#FFF',
    fontWeight: '600',
  },
});
