import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { IconSymbol } from './IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';

interface PostActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  isOwnPost: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onBoost?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canBoost?: boolean;
}

interface ActionItem {
  id: string;
  label: string;
  icon: string;
  androidIcon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

export const PostActionsSheet: React.FC<PostActionsSheetProps> = ({
  visible,
  onClose,
  isOwnPost,
  onEdit,
  onDelete,
  onReport,
  onBoost,
  canEdit = true,
  canDelete = true,
  canBoost = true,
}) => {
  const { isDark } = useThemeStore();
  const themeColors = isDark ? darkColors : lightColors;

  // Build actions list based on post ownership
  const actions: ActionItem[] = [];

  if (isOwnPost) {
    if (canEdit) {
      actions.push({
        id: 'edit',
        label: 'Edit Post',
        icon: 'pencil',
        androidIcon: 'edit',
        onPress: () => {
          console.log('PostActionsSheet: Edit action triggered');
          onEdit?.();
          onClose();
        },
      });
    }

    if (canBoost) {
      actions.push({
        id: 'boost',
        label: 'Boost Post',
        icon: 'flame.fill',
        androidIcon: 'local-fire-department',
        onPress: () => {
          console.log('PostActionsSheet: Boost action triggered');
          onBoost?.();
          onClose();
        },
      });
    }

    if (canDelete) {
      actions.push({
        id: 'delete',
        label: 'Delete Post',
        icon: 'trash',
        androidIcon: 'delete',
        onPress: () => {
          console.log('PostActionsSheet: Delete action triggered');
          onDelete?.();
          onClose();
        },
        destructive: true,
      });
    }
  } else {
    if (canBoost) {
      actions.push({
        id: 'boost',
        label: 'Boost Post',
        icon: 'flame.fill',
        androidIcon: 'local-fire-department',
        onPress: () => {
          console.log('PostActionsSheet: Boost action triggered');
          onBoost?.();
          onClose();
        },
      });
    }

    actions.push({
      id: 'report',
      label: 'Report Post',
      icon: 'exclamationmark.triangle',
      androidIcon: 'report',
      onPress: () => {
        console.log('PostActionsSheet: Report action triggered');
        onReport?.();
        onClose();
      },
      destructive: true,
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Overlay - tap to close */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {/* Bottom Sheet Container - prevent tap propagation */}
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: themeColors.card }]}>
              {/* Handle bar indicator */}
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: themeColors.border }]} />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: themeColors.text }]}>Post Actions</Text>

              {/* Action buttons */}
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.actionButton, { borderBottomColor: themeColors.border }]}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name={action.icon}
                    android_material_icon_name={action.androidIcon}
                    size={22}
                    color={action.destructive ? '#FF3B30' : themeColors.text}
                  />
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: action.destructive ? '#FF3B30' : themeColors.text },
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Cancel button */}
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: themeColors.background }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelLabel, { color: themeColors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  title: {
    ...typography.h2,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  actionLabel: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelLabel: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
  },
});
