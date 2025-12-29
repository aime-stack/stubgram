import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';
import * as Haptics from 'expo-haptics';

export default function CreateCommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const themeColors = isDark ? darkColors : lightColors;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a community name');
      return;
    }

    if (name.length < 3) {
      Alert.alert('Error', 'Community name must be at least 3 characters');
      return;
    }

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: community } = await apiClient.createCommunity({
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
      });

      Alert.alert(
        'Community Created!',
        `${community.name} is now live!`,
        [
          {
            text: 'View Community',
            onPress: () => router.replace({ pathname: '/communities/[slug]' as any, params: { slug: community.slug } }),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to create community:', error);
      Alert.alert('Error', error.message || 'Failed to create community');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Create Community</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={[styles.label, { color: themeColors.text }]}>Community Name *</Text>
            <View style={[styles.inputContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <IconSymbol ios_icon_name="person.3.fill" android_material_icon_name="groups" size={20} color={themeColors.textSecondary} />
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                placeholder="e.g., Tech Enthusiasts Rwanda"
                placeholderTextColor={themeColors.textSecondary}
                value={name}
                onChangeText={setName}
                editable={!isCreating}
                maxLength={50}
              />
            </View>
            <Text style={[styles.hint, { color: themeColors.textSecondary }]}>
              Choose a unique, descriptive name
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: themeColors.text }]}>Description</Text>
            <View style={[styles.inputContainer, styles.textArea, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <TextInput
                style={[styles.input, styles.textAreaInput, { color: themeColors.text }]}
                placeholder="What is this community about?"
                placeholderTextColor={themeColors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                editable={!isCreating}
                maxLength={500}
              />
            </View>
          </View>

          <View style={[styles.settingRow, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={styles.settingInfo}>
              <IconSymbol 
                ios_icon_name={isPrivate ? "lock.fill" : "lock.open.fill"} 
                android_material_icon_name={isPrivate ? "lock" : "lock-open"} 
                size={20} 
                color={themeColors.text} 
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>Private Community</Text>
                <Text style={[styles.settingDescription, { color: themeColors.textSecondary }]}>
                  Only members can see posts
                </Text>
              </View>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              disabled={isCreating}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
              thumbColor="#FFF"
            />
          </View>

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: themeColors.primary }, isCreating && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add-circle" size={24} color="#FFF" />
                <Text style={styles.createButtonText}>Create Community</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.guidelines}>
            <Text style={[styles.guidelinesTitle, { color: themeColors.text }]}>Community Guidelines</Text>
            <Text style={[styles.guidelinesText, { color: themeColors.textSecondary }]}>
              • Be respectful and welcoming to all members{'\n'}
              • Keep content relevant to the community's purpose{'\n'}
              • No spam, harassment, or inappropriate content{'\n'}
              • Follow StubGram's Terms of Service
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  form: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
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
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    ...typography.caption,
    fontSize: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  settingDescription: {
    ...typography.caption,
    fontSize: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
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
  guidelines: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  guidelinesTitle: {
    ...typography.body,
    fontWeight: '700',
  },
  guidelinesText: {
    ...typography.caption,
    lineHeight: 20,
  },
});
