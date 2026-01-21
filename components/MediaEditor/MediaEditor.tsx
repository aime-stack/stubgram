import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '../IconSymbol';
import ImageEditor from './ImageEditor';
import VideoEditor from './VideoEditor';
import { colors, spacing, typography } from '@/styles/commonStyles';

const { width, height } = Dimensions.get('window');

interface MediaEditorProps {
  mediaUri: string;
  mediaType: 'image' | 'video';
  initialFilter?: string;
  initialOverlays?: any[];
  onSave: (finalMedia: { uri: string; metadata: any }) => void;
  onCancel: () => void;
}

export default function MediaEditor({ 
  mediaUri, 
  mediaType, 
  initialFilter, 
  initialOverlays, 
  onSave, 
  onCancel 
}: MediaEditorProps) {
  const [isExporting, setIsExporting] = useState(false);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.iconButton}>
          <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Edit {mediaType === 'image' ? 'Photo' : 'Video'}</Text>
        
        <TouchableOpacity 
          onPress={() => {/* This will be triggered by editor instances */}} 
          style={styles.doneButton}
          disabled={isExporting}
        >
          <Text style={styles.doneButtonText}>Next</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.editorContainer}>
        {mediaType === 'image' ? (
          <ImageEditor 
            uri={mediaUri} 
            initialFilter={initialFilter}
            initialOverlays={initialOverlays}
            onExportStart={() => setIsExporting(true)}
            onExportFinish={(result: { uri: string; metadata: any }) => {
              setIsExporting(false);
              onSave(result);
            }}
          />
        ) : (
          <VideoEditor 
            uri={mediaUri} 
            onExportStart={() => setIsExporting(true)}
            onExportFinish={(result: { uri: string; metadata: any }) => {
              setIsExporting(false);
              onSave(result);
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 60,
    zIndex: 100,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  iconButton: {
    padding: 8,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  editorContainer: {
    flex: 1,
  },
});
