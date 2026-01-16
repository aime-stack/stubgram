import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => Promise<void>;
}

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam', icon: 'envelope.badge' },
  { id: 'inappropriate', label: 'Inappropriate Content', icon: 'exclamationmark.octagon' },
  { id: 'harassment', label: 'Harassment or Bullying', icon: 'person.crop.circle.badge.exclamationmark' },
  { id: 'false_info', label: 'False Information', icon: 'xmark.shield' },
  { id: 'other', label: 'Other', icon: 'ellipsis.circle' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { isDark } = useThemeStore();
  const themeColors = isDark ? darkColors : lightColors;
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }

    if (selectedReason === 'other' && !details.trim()) {
      Alert.alert('Error', 'Please provide details for your report');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(selectedReason, details);
      setSelectedReason('');
      setDetails('');
      onClose();
      Alert.alert('Success', 'Report submitted successfully. We\'ll review it shortly.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: themeColors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text }]}>Report Post</Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              Why are you reporting this post?
            </Text>

            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonItem,
                  { borderColor: themeColors.border },
                  selectedReason === reason.id && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <IconSymbol
                  ios_icon_name={reason.icon}
                  android_material_icon_name="report"
                  size={20}
                  color={selectedReason === reason.id ? colors.primary : themeColors.text}
                />
                <Text style={[
                  styles.reasonLabel,
                  { color: selectedReason === reason.id ? colors.primary : themeColors.text }
                ]}>
                  {reason.label}
                </Text>
                {selectedReason === reason.id && (
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={20}
                    color={colors.primary}
                    style={{ marginLeft: 'auto' } as any}
                  />
                )}
              </TouchableOpacity>
            ))}

            {(selectedReason === 'other' || selectedReason) && (
              <View style={styles.detailsSection}>
                <Text style={[styles.detailsLabel, { color: themeColors.text }]}>
                  Additional Details {selectedReason === 'other' && '(Required)'}
                </Text>
                <TextInput
                  style={[
                    styles.detailsInput,
                    { 
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                      borderColor: themeColors.border 
                    }
                  ]}
                  placeholder="Provide more context..."
                  placeholderTextColor={themeColors.textSecondary}
                  multiline
                  numberOfLines={4}
                  value={details}
                  onChangeText={setDetails}
                  textAlignVertical="top"
                />
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedReason || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason || isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modal: {
    borderRadius: borderRadius.xl,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    ...typography.h2,
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: spacing.md,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  reasonLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  detailsSection: {
    marginTop: spacing.md,
  },
  detailsLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  detailsInput: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 100,
    ...typography.body,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    alignItems: 'center',
    margin: spacing.md,
    borderRadius: borderRadius.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFF',
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
  },
});
