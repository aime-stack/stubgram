import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, SafeAreaView, Alert, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions, CameraCapturedPicture, CameraRecordingOptions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// @ts-ignore
import * as MediaLibrary from 'expo-media-library';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [mode, setMode] = useState<'picture' | 'video'>('video');
  const [activeFilter, setActiveFilter] = useState('Normal');

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  if (!permission || !micPermission) {
    return <View />;
  }

  if (!permission.granted || !micPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera and record audio</Text>
        <TouchableOpacity onPress={() => { requestPermission(); requestMicPermission(); }} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleFlash = () => {
    setFlash((current) => (current === 'off' ? 'on' : current === 'on' ? 'auto' : 'off'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
        exif: false,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to create post with image
      router.push({
        pathname: '/create-post',
        params: { mediaUri: photo?.uri, mediaType: 'image' }
      });
    } catch (error) {
      console.error('Failed to take picture:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsCapturing(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    
    setIsRecording(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });
      
      if (video) {
        // Navigate to create post with video
        router.push({
            pathname: '/create-post',
            params: { mediaUri: video.uri, mediaType: 'video' }
        });
      }
    } catch (error) {
      console.error('Failed to record video:', error);
      Alert.alert('Error', 'Failed to record video');
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;
    cameraRef.current.stopRecording();
    setIsRecording(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
        mode={mode}
      >
        <SafeAreaView style={styles.overlay}>
          {/* Header */}
          <View style={[styles.header, { top: insets.top + spacing.sm }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
                {isRecording && (
                    <View style={styles.recordingIndicator}>
                        <View style={styles.dot} />
                        <Text style={styles.recordingText}>{formatTime(recordingTime)}</Text>
                    </View>
                )}
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity onPress={toggleFlash} style={styles.iconButton}>
                <IconSymbol 
                  ios_icon_name={flash === 'on' ? "bolt.fill" : flash === 'auto' ? "bolt.badge.a.fill" : "bolt.slash.fill"} 
                  android_material_icon_name={flash === 'on' ? "flash-on" : flash === 'auto' ? "flash-auto" : "flash-off"} 
                  size={24} 
                  color="#FFF" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filters Carousel */}
          {!isRecording && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.filtersContainer}
                contentContainerStyle={styles.filtersContent}
              >
                  {['Normal', 'Vivid', 'B&W', 'Sepia', 'Cool', 'Warm'].map((f) => (
                      <TouchableOpacity 
                        key={f} 
                        style={[styles.filterButton, activeFilter === f && styles.activeFilterButton]}
                        onPress={() => {
                            setActiveFilter(f);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                          <Text style={[styles.filterText, activeFilter === f && styles.activeFilterText]}>{f}</Text>
                      </TouchableOpacity>
                  ))}
              </ScrollView>
          )}

          {/* Bottom Controls */}
          <View style={[styles.bottomControls, { bottom: insets.bottom + spacing.xl }]}>
            {/* Mode Selector */}
            <View style={styles.modeSelector}>
                <TouchableOpacity onPress={() => setMode('picture')}>
                    <Text style={[styles.modeText, mode === 'picture' && styles.activeModeText]}>PHOTO</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('video')} style={{ marginLeft: 20 }}>
                    <Text style={[styles.modeText, mode === 'video' && styles.activeModeText]}>VIDEO</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.mainControls}>
                <TouchableOpacity style={styles.secondaryButton}>
                   <View style={styles.galleryPreview} />
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={mode === 'video' ? (isRecording ? stopRecording : startRecording) : takePicture}
                    onLongPress={mode === 'picture' ? startRecording : undefined}
                    onPressOut={mode === 'picture' && isRecording ? stopRecording : undefined}
                    style={[styles.captureButton, isRecording && styles.recordingButton]}
                >
                    <View style={[styles.captureInner, isRecording && styles.recordingInner]} />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleFacing} style={styles.secondaryButton}>
                    <IconSymbol ios_icon_name="camera.rotate" android_material_icon_name="flip-camera-ios" size={28} color="#FFF" />
                </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#FFF',
    ...typography.body,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerCenter: {
      flex: 1,
      alignItems: 'center',
  },
  headerRight: {
      flex: 1,
      alignItems: 'flex-end',
  },
  recordingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
  },
  dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#FF3B30',
  },
  recordingText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 30,
  },
  modeSelector: {
      flexDirection: 'row',
      backgroundColor: 'rgba(0,0,0,0.3)',
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
  },
  modeText: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
  },
  activeModeText: {
      color: '#FFD60A',
  },
  mainControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-evenly',
      width: '100%',
  },
  secondaryButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  galleryPreview: {
      width: 34,
      height: 34,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: '#FFF',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
      borderColor: 'rgba(255,59,48,0.3)',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
  },
  recordingInner: {
      backgroundColor: '#FF3B30',
      width: 30,
      height: 30,
      borderRadius: 4,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  filtersContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    height: 40,
  },
  filtersContent: {
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeFilterButton: {
    backgroundColor: '#FFD60A',
    borderColor: '#FFD60A',
  },
  filterText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  activeFilterText: {
    color: '#000',
  },
});
