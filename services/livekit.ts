// LIVEKIT TEMPORARILY DISABLED FOR TESTING
// import {
//     useParticipant,
//     useRoom,
// } from '@livekit/react-native';
// import {
//     Room,
//     RoomEvent,
//     RoomOptions,
//     Track,
//     Participant,
//     ConnectionQuality,
//     RoomConnectOptions,
//     AudioPresets,
//     VideoPresets,
// } from 'livekit-client';

// Mock LiveKit service for testing without LiveKit dependencies
class LiveKitService {
    private room: any = null;

    async connect(url: string, token: string) {
        console.log('[LiveKit DISABLED] Mock connect called with:', { url, token });
        // Return a mock room object
        this.room = {
            name: 'mock-room',
            on: () => {},
            localParticipant: {
                setMicrophoneEnabled: async () => {},
                setCameraEnabled: async () => {},
                isMicrophoneEnabled: false,
            }
        };
        return this.room;
    }

    async disconnect() {
        console.log('[LiveKit DISABLED] Mock disconnect called');
        this.room = null;
    }

    getRoom() {
        return this.room;
    }

    async enableVideo() {
        console.log('[LiveKit DISABLED] Mock enableVideo called');
    }

    async disableVideo() {
        console.log('[LiveKit DISABLED] Mock disableVideo called');
    }

    async toggleMute() {
        console.log('[LiveKit DISABLED] Mock toggleMute called');
        return true;
    }
}

export const livekitService = new LiveKitService();
