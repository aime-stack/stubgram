import React from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';

const { width, height } = Dimensions.get('window');

interface ImageModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ visible, imageUrl, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={32} color="#FFF" />
        </TouchableOpacity>
        
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  image: {
    width: width,
    height: height * 0.8,
  },
});
