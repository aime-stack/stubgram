import React, { useState, useRef } from 'react';
import { View, StyleSheet, Image, Dimensions, TouchableOpacity, Text, ScrollView } from 'react-native';
// @ts-ignore
import ViewShot from 'react-native-view-shot';
// @ts-ignore
import { ColorMatrix, concatColorMatrices, brightness, contrast, saturate, sepia } from 'react-native-color-matrix-image-filters';
import { IconSymbol } from '../IconSymbol';
import TextOverlay from './TextOverlay';
import StickerPicker from './StickerPicker';
import { colors, spacing } from '@/styles/commonStyles';

const { width } = Dimensions.get('window');
const PREVIEW_ASPECT_RATIO = 9 / 16;
const PREVIEW_HEIGHT = width / PREVIEW_ASPECT_RATIO;

interface ImageEditorProps {
  uri: string;
  initialFilter?: string;
  initialOverlays?: any[];
  onExportStart: () => void;
  onExportFinish: (result: { uri: string; metadata: any }) => void;
}

const FILTERS = [
  { name: 'Normal', matrix: null },
  { name: 'Vivid', matrix: saturate(1.5) },
  { name: 'B&W', matrix: saturate(0) },
  { name: 'Sepia', matrix: sepia() },
  { name: 'Warm', matrix: concatColorMatrices(saturate(1.2), contrast(1.1)) },
  { name: 'Cool', matrix: concatColorMatrices(saturate(0.8), brightness(1.1)) },
];

export default function ImageEditor({ 
  uri, 
  initialFilter, 
  initialOverlays, 
  onExportStart, 
  onExportFinish 
}: ImageEditorProps) {
  const [selectedFilter, setSelectedFilter] = useState(() => {
    if (initialFilter) {
      const idx = FILTERS.findIndex(f => f.name === initialFilter);
      return idx !== -1 ? idx : 0;
    }
    return 0;
  });
  const [overlays, setOverlays] = useState<any[]>(initialOverlays || []);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [isStickerPickerVisible, setIsStickerPickerVisible] = useState(false);
  
  const viewShotRef = useRef<ViewShot>(null);

  const addText = () => {
    const newOverlay = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      text: 'Type here',
      color: '#FFF',
    };
    setOverlays([...overlays, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
  };

  const addSticker = (sticker: string) => {
    const newOverlay = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'sticker',
      content: sticker,
    };
    setOverlays([...overlays, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
  };

  const exportImage = async () => {
    if (!viewShotRef.current?.capture) return;
    
    onExportStart();
    try {
      const capturedUri = await viewShotRef.current.capture();
      onExportFinish({
        uri: capturedUri,
        metadata: {
          filter: FILTERS[selectedFilter].name,
          overlays: overlays,
          editorVersion: 2,
        }
      });
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  return (
    <View style={styles.container}>
      <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
        <View style={styles.previewContainer}>
          {FILTERS[selectedFilter].matrix ? (
            <ColorMatrix matrix={FILTERS[selectedFilter].matrix}>
              <Image source={{ uri }} style={styles.previewImage} />
            </ColorMatrix>
          ) : (
            <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
          )}
          
          {overlays.map((overlay) => (
            <TextOverlay
              key={overlay.id}
              id={overlay.id}
              initialText={overlay.type === 'text' ? overlay.text : overlay.content}
              color={overlay.color || '#FFF'}
              isSelected={selectedOverlayId === overlay.id}
              onSelect={setSelectedOverlayId}
              onUpdate={(id, updates) => {
                setOverlays(overlays.map(o => o.id === id ? { ...o, ...updates } : o));
              }}
            />
          ))}
        </View>
      </ViewShot>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {FILTERS.map((filter, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.filterTab, selectedFilter === index && styles.activeFilterTab]}
              onPress={() => setSelectedFilter(index)}
            >
              <Text style={[styles.filterText, selectedFilter === index && styles.activeFilterText]}>
                {filter.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={addText}>
            <IconSymbol ios_icon_name="textformat" android_material_icon_name="title" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => setIsStickerPickerVisible(true)}>
            <IconSymbol ios_icon_name="face.smiling" android_material_icon_name="face" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.mainActionButton]} 
            onPress={exportImage}
          >
            <Text style={styles.mainActionText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <StickerPicker 
        isVisible={isStickerPickerVisible} 
        onClose={() => setIsStickerPickerVisible(false)}
        onSelect={addSticker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  previewContainer: {
    width: width,
    height: PREVIEW_HEIGHT,
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  toolbar: {
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  filterScroll: {
    marginBottom: spacing.md,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#333',
  },
  activeFilterTab: {
    backgroundColor: colors.primary,
  },
  filterText: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#FFF',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainActionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  mainActionText: {
    color: '#FFF',
    fontWeight: '700',
  }
});
