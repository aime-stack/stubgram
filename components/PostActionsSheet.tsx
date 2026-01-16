import React from 'react';
import { ActionSheetIOS, Platform, Alert } from 'react-native';

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
  React.useEffect(() => {
    if (visible && Platform.OS === 'ios') {
      const options = isOwnPost
        ? ['Edit Post', 'Boost Post', 'Delete Post', 'Cancel']
        : ['Boost Post', 'Report Post', 'Cancel'];
      
      const destructiveButtonIndex = isOwnPost ? 2 : 1;
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
        },
        (buttonIndex) => {
          if (isOwnPost) {
            if (buttonIndex === 0) onEdit?.();
            else if (buttonIndex === 1) onBoost?.();
            else if (buttonIndex === 2) onDelete?.();
          } else {
            if (buttonIndex === 0) onBoost?.();
            else if (buttonIndex === 1) onReport?.();
          }
          onClose();
        }
      );
    } else if (visible && Platform.OS === 'android') {
      // For Android, use Alert with buttons
      const buttons = isOwnPost
        ? [
            { text: 'Edit Post', onPress: () => { onEdit?.(); onClose(); } },
            { text: 'Boost Post', onPress: () => { onBoost?.(); onClose(); } },
            { text: 'Delete Post', onPress: () => { onDelete?.(); onClose(); }, style: 'destructive' as const },
            { text: 'Cancel', onPress: onClose, style: 'cancel' as const },
          ]
        : [
            { text: 'Boost Post', onPress: () => { onBoost?.(); onClose(); } },
            { text: 'Report Post', onPress: () => { onReport?.(); onClose(); }, style: 'destructive' as const },
            { text: 'Cancel', onPress: onClose, style: 'cancel' as const },
          ];

      Alert.alert('Post Actions', 'Choose an action', buttons);
    }
  }, [visible, isOwnPost, onEdit, onDelete, onReport, onBoost, onClose]);

  return null;
};
