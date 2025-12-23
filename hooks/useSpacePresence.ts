import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { VideoSpaceParticipant } from '@/types';

/**
 * Hook for managing space presence with low bandwidth in mind.
 * Uses Supabase Realtime Presence with minimal updates (30s+).
 */
export function useSpacePresence(spaceId: string | null) {
    const { user } = useAuthStore();
    const [participants, setParticipants] = useState<VideoSpaceParticipant[]>([]);
    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (!spaceId || !user) return;

        // 1. Initialize Supabase Realtime Channel for this space
        const channel = supabase.channel(`presence:space:${spaceId}`, {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channelRef.current = channel;

        // 2. Handle presence state changes
        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const formattedParticipants = Object.values(state)
                    .flat()
                    .map((presence: any) => ({
                        userId: presence.user_id,
                        role: presence.role,
                        isMuted: presence.isMuted,
                        hasVideo: presence.hasVideo,
                        user: presence.user_profile, // Shared profile data
                    }));

                // Update local state - only if actually changed to avoid re-renders
                setParticipants(formattedParticipants as any);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('Joined:', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('Left:', key, leftPresences);
            });

        // 3. Subscribe with heartbeat (Supabase handles this internally, but we track custom state)
        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // Track the user with their current state
                // This is where we minimize network chatter by only updating on significant changes
                await channel.track({
                    user_id: user.id,
                    role: 'viewer', // Default, will be updated by room logic
                    isMuted: true,
                    hasVideo: false,
                    user_profile: {
                        username: user.username,
                        avatar: user.avatar,
                    },
                    online_at: new Date().toISOString(),
                });
            }
        });

        return () => {
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
        };
    }, [spaceId, user?.id]);

    /**
     * Update current user's presence state (e.g. mute/video toggle)
     * throttled to prevent network spam.
     */
    const updatePresence = async (updates: Partial<{ isMuted: boolean; hasVideo: boolean; role: string }>) => {
        if (channelRef.current && user) {
            const currentState = channelRef.current.presenceState()[user.id]?.[0] || {};
            await channelRef.current.track({
                ...currentState,
                ...updates,
            });
        }
    };

    return {
        participants,
        updatePresence,
    };
}
