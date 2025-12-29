import { createClient } from "@supabase/supabase-js"
import { AccessToken } from "livekit-server-sdk"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log(`[generate-token] Request received: ${req.method}`);

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            console.error('[generate-token] Missing Supabase environment variables');
            throw new Error('Server configuration error: Missing Supabase keys');
        }

        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.error('[generate-token] Missing Authorization header');
            throw new Error('No authorization header');
        }

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
            authHeader.replace('Bearer ', '')
        )
        if (userError || !user) {
            console.error('[generate-token] Authentication failed:', userError);
            throw new Error('Unauthorized');
        }

        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error('[generate-token] Failed to parse request body:', e);
            throw new Error('Invalid request body');
        }

        const { spaceId, meetingId } = body;
        const targetId = meetingId || spaceId;
        
        if (!targetId) {
            console.error('[generate-token] ID is missing in request body');
            throw new Error('Meeting or Space ID is required');
        }

        console.log(`[generate-token] Token request for user ${user.id} in meeting ${targetId}`);

        // 1. Fetch meeting info
        const { data: meeting, error: meetingError } = await supabaseClient
            .from('meetings')
            .select('*')
            .eq('id', targetId)
            .maybeSingle()

        if (meetingError) {
            console.error('[generate-token] Database error fetching meeting:', meetingError);
            throw new Error(`Failed to fetch meeting: ${meetingError.message}`);
        }
        
        // If not found in meetings, try video_spaces for backward compatibility (optional but safer)
        let finalMeeting = meeting;
        let isLegacySpace = false;
        
        if (!finalMeeting) {
            const { data: space } = await supabaseClient
                .from('video_spaces')
                .select('*')
                .eq('id', targetId)
                .maybeSingle();
            
            if (space) {
                finalMeeting = space;
                isLegacySpace = true;
            }
        }

        if (!finalMeeting) {
            console.error(`[generate-token] Meeting ${targetId} not found`);
            throw new Error('Meeting not found');
        }

        // 2. Check or Create participation
        const participantTable = isLegacySpace ? 'video_space_participants' : 'meeting_participants';
        const idCol = isLegacySpace ? 'space_id' : 'meeting_id';

        let { data: participation, error: partError } = await supabaseClient
            .from(participantTable)
            .select('role')
            .eq(idCol, targetId)
            .eq('user_id', user.id)
            .is('left_at', null)
            .maybeSingle()

        if (partError) {
            console.error('[generate-token] Database error fetching participation:', partError);
            throw partError;
        }

        if (!participation) {
            // Auto-join if public or user is host
            const isHost = finalMeeting.host_id === user.id;
            const isPublic = isLegacySpace ? finalMeeting.type === 'public' : !finalMeeting.is_private;

            if (isPublic || isHost) {
                console.log(`[generate-token] Auto-joining user ${user.id} to ${targetId}`);
                const { data: newPart, error: joinError } = await supabaseClient
                    .from(participantTable)
                    .insert({
                        [idCol]: targetId,
                        user_id: user.id,
                        role: isHost ? 'host' : 'participant'
                    })
                    .select('role')
                    .single()

                if (joinError) {
                    console.error('[generate-token] Failed to auto-join user:', joinError);
                    throw new Error(`Failed to join: ${joinError.message}`);
                }
                participation = newPart
            } else {
                console.warn(`[generate-token] User ${user.id} attempted to join private meeting ${targetId} without invitation`);
                throw new Error('You are not a participant of this meeting.');
            }
        }

        // 3. Fetch user profile for display name
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single()

        const username = profile?.username ?? 'Anonymous'
        const role = participation?.role ?? 'participant'

        // 4. Generate LiveKit Token
        const apiKey = Deno.env.get('LIVEKIT_API_KEY')
        const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')
        const wsUrl = Deno.env.get('LIVEKIT_WS_URL')

        if (!apiKey || !apiSecret || !wsUrl) {
            console.error('[generate-token] Missing LiveKit ENV keys');
            throw new Error('LiveKit configuration is missing on server.')
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: user.id,
            name: username,
        })

        at.addGrant({
            roomJoin: true,
            room: targetId,
            canPublish: role !== 'viewer' && role !== 'participant', // In Meetings, maybe only host/co-host can publish by default? 
            // Client requested: "Meetings must support: Video on/off, Microphone mute/unmute"
            // So everyone should be able to publish.
            canPublish: true, 
            canSubscribe: true,
            canPublishData: true, 
        })

        console.log(`[generate-token] Token generated successfully for ${user.id}`);

        return new Response(
            JSON.stringify({
                token: at.toJwt(),
                wsUrl: wsUrl
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: unknown) {
        console.error('[generate-token] Catch Block Error:', error);
        const err = error as Record<string, unknown>;
        return new Response(
            JSON.stringify({ 
                error: (err.message as string) || 'Unknown error',
                details: (err.details as string) || (err.hint as string) || (err.stack as string) || null,
                raw: err
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
