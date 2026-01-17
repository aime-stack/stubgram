import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { livekitService } from '@/services/livekit';
import { apiClient } from '@/services/api';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';
import { RoomEvent, ConnectionQuality, Participant } from 'livekit-client';

import { Meeting, MeetingParticipant } from '@/types';
import * as Network from 'expo-network';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

export default function MeetingRoomScreen() {
  const router = useRouter();
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const network = useNetworkQuality();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  const [isHost, setIsHost] = useState(false);

  const loadMeetingData = useCallback(async () => {
    if (!meetingId) return;

    try {
      const { data: meetingData } = await apiClient.getMeetingByCode(meetingId);
      setMeeting(meetingData);
      setIsHost(meetingData.hostId === user?.id);

      const { data: participantData } = await apiClient.getMeetingParticipants(meetingData.id);
      setParticipants(participantData);
    } catch (error) {
      console.error('Failed to load meeting data:', error);
      Alert.alert('Error', 'Failed to load meeting details');
      router.back();
    }
  }, [meetingId, user?.id]);

  const connectToMeeting = useCallback(async () => {
    if (!meetingId || !user || !network.isConnected) return;

    try {
      setIsConnecting(true);

      // Generate token via Edge Function
      console.log('[MeetingRoomScreen] Generating token for meeting:', meetingId);
      const { data, error } = await supabase.functions.invoke('generate-token', {
        body: { meetingId },
      });

      console.log('[MeetingRoomScreen] generate-token raw response:', { 
        data: data ? 'present' : 'missing', 
        error: error ? error : 'none',
        hasToken: data?.token ? 'yes' : 'no'
      });

      if (error) {
        console.error('[MeetingRoomScreen] generate-token INVOKE error:', error);
        throw error;
      }

      if (!data || !data.token) {
        console.error('[MeetingRoomScreen] generate-token missing token in data:', data);
        throw new Error('Server returned success but no token received.');
      }

      // Connect to LiveKit
      const connectedRoom = await livekitService.connect(data.wsUrl, data.token);

      // Monitor quality
      connectedRoom.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality, p: Participant) => {
        if (p.isLocal) {
          setNetworkQuality(quality);
          // Auto-disable video on poor quality
          if (quality === ConnectionQuality.Poor && isCameraOn) {
            livekitService.disableVideo();
            setIsCameraOn(false);
            Alert.alert('Data Saving', 'Video disabled to protect connection quality.');
          }
        }
      });

      // Listen for participant updates
      connectedRoom.on(RoomEvent.ParticipantConnected, () => {
        loadMeetingData();
      });

      connectedRoom.on(RoomEvent.ParticipantDisconnected, () => {
        loadMeetingData();
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Connection error:', error);
      
      let errorMessage = error.message || 'Could not join meeting.';
      Alert.alert('Connection Failed', errorMessage);
      router.back();
    } finally {
      setIsConnecting(false);
    }
  }, [meetingId, user, network.isConnected, isCameraOn, loadMeetingData]);

  useEffect(() => {
    loadMeetingData();
  }, [loadMeetingData]);

  useEffect(() => {
    connectToMeeting();
    return () => {
      livekitService.disconnect();
    };
  }, [connectToMeeting]);

  // Auto-reconnect flow
  useEffect(() => {
    if (network.isConnected && !isConnecting && !livekitService.getRoom()) {
      connectToMeeting();
    }
  }, [network.isConnected, isConnecting, connectToMeeting]);

  const handleToggleMute = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMuteState = await livekitService.toggleMute();
    setIsMuted(newMuteState ?? true);
  };

  const handleToggleCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!isCameraOn && network.type === Network.NetworkStateType.CELLULAR) {
      Alert.alert(
        'Data Usage',
        'Video uses more data. Continue on cellular?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              await livekitService.enableVideo();
              setIsCameraOn(true);
            },
          },
        ]
      );
      return;
    }

    if (isCameraOn) {
      await livekitService.disableVideo();
      setIsCameraOn(false);
    } else {
      await livekitService.enableVideo();
      setIsCameraOn(true);
    }
  };

  const handleCopyMeetingCode = async () => {
    if (!meetingId) return;
    await Clipboard.setStringAsync(meetingId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', `Meeting code ${meetingId} copied to clipboard`);
  };

  const handleLeaveMeeting = async () => {
    Alert.alert(
      'Leave Meeting',
      'Are you sure you want to leave?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.leaveMeeting(meeting!.id);
              livekitService.disconnect();
              router.back();
            } catch (error) {
              console.error('Failed to leave meeting:', error);
              livekitService.disconnect();
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleEndMeeting = () => {
    Alert.alert(
      'End Meeting',
      'This will end the meeting for all participants. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Meeting',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.endMeeting(meetingId!);
              livekitService.disconnect();
              router.back();
            } catch (error) {
              console.error('Failed to end meeting:', error);
              Alert.alert('Error', 'Failed to end meeting');
            }
          },
        },
      ]
    );
  };

  const renderParticipant = ({ item }: { item: MeetingParticipant }) => {
    const isSelf = item.userId === user?.id;

    return (
      <View style={styles.participantCard}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: item.user.avatar || 'https://via.placeholder.com/80' }}
            style={[styles.avatar, item.hasVideo && styles.avatarWithVideo]}
          />
          {item.isMuted && (
            <View style={styles.muteBadge}>
              <IconSymbol ios_icon_name="mic.slash.fill" android_material_icon_name="mic-off" size={12} color="#FFFFFF" />
            </View>
          )}
          {item.role === 'host' && (
            <View style={styles.hostBadge}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={10} color="#FFD60A" />
            </View>
          )}
        </View>
        <Text style={styles.participantName} numberOfLines={1}>
          {isSelf ? 'You' : `@${item.user.username}`}
        </Text>
      </View>
    );
  };

  if (isConnecting || !meeting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Joining meeting...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Offline Banner */}
      {!network.isConnected && (
        <View style={styles.offlineBanner}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.offlineText}>Network Lost. Waiting to reconnect...</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleLeaveMeeting}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.roomInfo}>
          <Text style={styles.meetingTitle} numberOfLines={1}>
            {meeting.title}
          </Text>
          <View style={styles.meetingMeta}>
            <View style={styles.liveBadge}>
              <View style={styles.liveIndicator} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <TouchableOpacity onPress={handleCopyMeetingCode} style={styles.codeButton}>
              <IconSymbol ios_icon_name="doc.on.doc" android_material_icon_name="content-copy" size={12} color={colors.primary} />
              <Text style={styles.codeText}>{meetingId}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isHost ? (
          <TouchableOpacity style={styles.endButton} onPress={handleEndMeeting}>
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.error} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Participants Grid */}
      <View style={styles.content}>
        <FlatList
          data={participants}
          renderItem={renderParticipant}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          ListHeaderComponent={
            <Text style={styles.participantCount}>
              {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
            </Text>
          }
        />
      </View>

      {/* Control Bar */}
      <View style={[styles.controlBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* Network Quality */}
        <View style={styles.qualityBadge}>
          <IconSymbol
            ios_icon_name="antenna.radiowaves.left.and.right"
            android_material_icon_name="signal-cellular-alt"
            size={14}
            color={
              networkQuality === ConnectionQuality.Excellent
                ? '#4CAF50'
                : networkQuality === ConnectionQuality.Poor
                ? '#FFC107'
                : '#FFFFFF'
            }
          />
          <Text style={styles.qualityText}>
            {networkQuality === ConnectionQuality.Excellent
              ? 'Excellent'
              : networkQuality === ConnectionQuality.Poor
              ? 'Poor'
              : 'Good'}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={handleToggleMute}>
            <View style={[styles.iconCircle, isMuted && styles.iconCircleMuted]}>
              <IconSymbol
                ios_icon_name={isMuted ? 'mic.slash.fill' : 'mic.fill'}
                android_material_icon_name={isMuted ? 'mic-off' : 'mic'}
                size={24}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={handleToggleCamera}>
            <View style={[styles.iconCircle, isCameraOn && styles.iconCircleVideo]}>
              <IconSymbol
                ios_icon_name={isCameraOn ? 'video.fill' : 'video.slash.fill'}
                android_material_icon_name={isCameraOn ? 'videocam' : 'videocam-off'}
                size={24}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.controlLabel}>{isCameraOn ? 'Video' : 'No Video'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, styles.leaveBtn]} onPress={handleLeaveMeeting}>
            <View style={[styles.iconCircle, styles.iconCircleLeave]}>
              <IconSymbol ios_icon_name="phone.down.fill" android_material_icon_name="call-end" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.controlLabel}>Leave</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  offlineBanner: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  roomInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  meetingTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  meetingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  endButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  grid: {
    padding: spacing.md,
  },
  participantCount: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  participantCard: {
    flex: 1 / 3,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarWithVideo: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  muteBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  hostBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    backgroundColor: '#000',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  participantName: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  controlBar: {
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  qualityBadge: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qualityText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  controlBtn: {
    alignItems: 'center',
    gap: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleMuted: {
    backgroundColor: colors.error,
  },
  iconCircleVideo: {
    backgroundColor: colors.primary,
  },
  iconCircleLeave: {
    backgroundColor: colors.error,
  },
  controlLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    fontSize: 11,
  },
  leaveBtn: {
    // Additional styling if needed
  },
});
