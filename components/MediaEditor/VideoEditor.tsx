import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Animated } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { IconSymbol } from '../IconSymbol';
import { colors, spacing } from '@/styles/commonStyles';

const { width } = Dimensions.get('window');
const PREVIEW_ASPECT_RATIO = 9 / 16;
const PREVIEW_HEIGHT = width / PREVIEW_ASPECT_RATIO;

interface VideoEditorProps {
  uri: string;
  onExportStart: () => void;
  onExportFinish: (result: { uri: string; metadata: any }) => void;
}

export default function VideoEditor({ uri, onExportStart, onExportFinish }: VideoEditorProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [trimRange, setTrimRange] = useState({ start: 0, end: 1 }); // 0-1 percentage
  
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', (status) => {
      // In a real app we'd get duration here
    });
    return () => sub.remove();
  }, [player]);

  const handleExport = () => {
    onExportStart();
    // Simulate processing
    setTimeout(() => {
      onExportFinish({
        uri, // Keep original URI, backend/transcoder handles trim
        metadata: {
          trim: trimRange,
          editorVersion: 2,
          type: 'video'
        }
      });
    }, 500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.previewContainer}>
        <VideoView 
          player={player} 
          style={styles.video} 
          contentFit="cover"
        />
        
        <TouchableOpacity 
          style={styles.playOverlay} 
          onPress={() => {
            if (player.playing) player.pause();
            else player.play();
            setIsPlaying(!isPlaying);
          }}
        >
          {!isPlaying && <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={60} color="rgba(255,255,255,0.8)" />}
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.sectionTitle}>Trim Video</Text>
        <View style={styles.trimContainer}>
          <View style={styles.trimTrack}>
            <View style={[styles.trimSelection, { left: `${trimRange.start * 100}%`, width: `${(trimRange.end - trimRange.start) * 100}%` }]} />
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleExport}>
          <Text style={styles.saveButtonText}>Apply Changes</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbar: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  trimContainer: {
    height: 60,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  trimTrack: {
    height: 40,
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  trimSelection: {
    height: '100%',
    backgroundColor: colors.primary,
    opacity: 0.5,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  }
});
