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

    async connect(url: string, token: string, options: RoomConnectOptions = {}): Promise<Room> {
        if (this.room) {
            await this.disconnect();
        }

        this.room = new Room({
            adaptiveStream: true,
            dynacast: true,
            publishDefaults: {
                simulcast: true,
                videoSimulcastLayers: [
                    VideoPresets.h540,
                    VideoPresets.h216,
                ],
                videoCodec: 'vp8',
            },
        });

        await this.room.connect(url, token, options);
        console.log('Connected to LiveKit room', this.room.name);
        return this.room;
    }

    async disconnect() {
        if (this.room) {
            await this.room.disconnect();
            this.room = null;
        }
    }

    getRoom(): Room | null {
        return this.room;
    }

    async enableVideo() {
        if (this.room && this.room.localParticipant) {
            await this.room.localParticipant.setCameraEnabled(true);
        }
    }

    async disableVideo() {
        if (this.room && this.room.localParticipant) {
            await this.room.localParticipant.setCameraEnabled(false);
        }
    }

    async toggleMute(): Promise<boolean> {
        if (this.room && this.room.localParticipant) {
            const isEnabled = this.room.localParticipant.isMicrophoneEnabled;
            await this.room.localParticipant.setMicrophoneEnabled(!isEnabled);
            return !isEnabled;
        }
        return true;
    }
}

export const livekitService = new LiveKitService();
