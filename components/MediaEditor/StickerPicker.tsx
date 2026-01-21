import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Modal, Dimensions } from 'react-native';
import { IconSymbol } from '../IconSymbol';
import { spacing, colors } from '@/styles/commonStyles';

const { height } = Dimensions.get('window');

const STICKERS = [
  '🔥', '❤️', '😂', '✨', '⚡️', '🌈', '🎨', '🍕', '🎉', '📸',
  '😎', '💯', '👑', '⭐️', '👾', '🚀', '🍔', '🍦', '💎', '💡'
];

interface StickerPickerProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (sticker: string) => void;
}

export default function StickerPicker({ isVisible, onClose, onSelect }: StickerPickerProps) {
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Stickers</Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.stickerGrid}>
            {STICKERS.map((sticker, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.stickerItem}
                onPress={() => {
                  onSelect(sticker);
                  onClose();
                }}
              >
                <Text style={styles.stickerText}>{sticker}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.4,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  stickerItem: {
    width: '23%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  stickerText: {
    fontSize: 40,
  }
});
