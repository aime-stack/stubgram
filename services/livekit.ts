import {
    useParticipant,
    useRoom,
} from '@livekit/react-native';
import {
    Room,
    RoomEvent,
    RoomOptions,
    Track,
    Participant,
    ConnectionQuality,
    RoomConnectOptions,
    AudioPresets,
    VideoPresets,
} from 'livekit-client';

class LiveKitService {
    private room: Room | null = null;

    /**
     * Room configuration optimized for low-bandwidth African networks.
     * Audio-first, adaptive bitrate, and aggressive dynacast.
     */
    private roomOptions: RoomOptions = {
        adaptiveStream: true, // Only download video quality needed for UI
        dynacast: true,        // Only publish video if someone is watching
        publishDefaults: {
            audioPreset: AudioPresets.speech, // Optimized for 20-32kbps
            videoEncoding: {
                maxBitrate: 300_000,           // 300kbps max (low bandwidth)
                maxFramerate: 15,              // Smooth enough for mobile
            },
            videoSimulcastLayers: [
                VideoPresets.h180,    // 180p very low bandwidth
                VideoPresets.h360,    // 360p standard low bandwidth
            ],
        },
        videoCaptureDefaults: {
            resolution: VideoPresets.h360.resolution,
        },
    };

    async connect(url: string, token: string) {
        if (this.room) {
            await this.room.disconnect();
        }

        this.room = new Room(this.roomOptions);

        // Setup network quality monitoring
        this.room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
            if (participant?.isLocal) {
                console.log('Local network quality:', quality);
                // We can expose this to UI for the network status indicator
            }
        });

        this.room.on(RoomEvent.Disconnected, (reason) => {
            console.log('Disconnected from room:', reason);
        });

        const connectOptions: RoomConnectOptions = {
            autoSubscribe: true, // Automatically subscribe to audio/video
        };

        try {
            await this.room.connect(url, token, connectOptions);
            console.log('Connected to space:', this.room.name);

            // AUDIO-FIRST: Connect with microphone enabled but camera DISABLED
            await this.room.localParticipant.setMicrophoneEnabled(true);
            await this.room.localParticipant.setCameraEnabled(false);

            return this.room;
        } catch (error) {
            console.error('Failed to connect to space:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.room) {
            await this.room.disconnect();
            this.room = null;
        }
    }

    getRoom() {
        return this.room;
    }

    /**
     * Explicitly enable video (temporary burst)
     */
    async enableVideo() {
        if (!this.room?.localParticipant) return;
        await this.room.localParticipant.setCameraEnabled(true);
    }

    async disableVideo() {
        if (!this.room?.localParticipant) return;
        await this.room.localParticipant.setCameraEnabled(false);
    }

    async toggleMute() {
        if (!this.room?.localParticipant) return;
        const isMuted = !this.room.localParticipant.isMicrophoneEnabled;
        await this.room.localParticipant.setMicrophoneEnabled(isMuted);
        return isMuted;
    }
}

export const livekitService = new LiveKitService();
