import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
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
}

export const PostActionsSheet: React.FC<PostActionsSheetProps> = ({
  visible,
  onClose,
  isOwnPost,
  onEdit,
  onDelete,
  onReport,
  onBoost,
}) => {
  const { isDark } = useThemeStore();
  const themeColors = isDark ? darkColors : lightColors;

  const actions = isOwnPost
    ? [
        { icon: 'pencil', materialIcon: 'edit', label: 'Edit Post', onPress: onEdit, color: themeColors.text },
        { icon: 'megaphone', materialIcon: 'campaign', label: 'Boost Post', onPress: onBoost, color: colors.primary },
        { icon: 'trash', materialIcon: 'delete', label: 'Delete Post', onPress: onDelete, color: '#FF3B30' },
      ]
    : [
        { icon: 'megaphone', materialIcon: 'campaign', label: 'Boost Post', onPress: onBoost, color: colors.primary },
        { icon: 'exclamationmark.triangle', materialIcon: 'report', label: 'Report Post', onPress: onReport, color: '#FF3B30' },
      ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay} 
        onPress={onClose}
      >
        <Pressable onPress={(e) => {}}>
          <View style={[styles.sheet, { backgroundColor: themeColors.card }]}>
            <View style={[styles.handle, { backgroundColor: themeColors.border }]} />
            
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.actionItem,
                  index !== actions.length - 1 && { borderBottomWidth: 1, borderBottomColor: themeColors.border }
                ]}
                onPress={() => {
                  action.onPress?.();
                  onClose();
                }}
              >
                <IconSymbol
                  ios_icon_name={action.icon as any}
                  android_material_icon_name={action.materialIcon as any}
                  size={22}
                  color={action.color}
                />
                <Text style={[styles.actionLabel, { color: action.color }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: spacing.sm }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: themeColors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
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
    paddingHorizontal: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  actionLabel: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  cancelText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
  },
});
