import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { AccessToken } from "https://esm.sh/livekit-server-sdk@1.2.6"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('No authorization header')

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
            authHeader.replace('Bearer ', '')
        )
        if (userError || !user) throw new Error('Unauthorized')

        const { spaceId } = await req.json()
        if (!spaceId) throw new Error('Space ID is required')

        // 1. Verify user is allowed to join (check participants table)
        // For a new joiner, we might need to check if they CAN join (e.g. invite code or public)
        // But usually this function is called AFTER the client has successfully INSERTED into participants 
        // or if they are the host.

        const { data: participation, error: partError } = await supabaseClient
            .from('video_space_participants')
            .select('role, video_spaces(status, type, host_id)')
            .eq('space_id', spaceId)
            .eq('user_id', user.id)
            .is('left_at', null)
            .single()

        if (partError || !participation) {
            // Check if user is the host and maybe hasn't joined yet (unlikely due to trigger but safe)
            const { data: space } = await supabaseClient
                .from('video_spaces')
                .select('host_id, status')
                .eq('id', spaceId)
                .single()

            if (!space || space.host_id !== user.id) {
                throw new Error('You are not a participant of this space.')
            }
        }

        // 2. Fetch user profile for display name
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single()

        const username = profile?.username ?? 'Anonymous'
        const role = participation?.role ?? 'host'

        // 3. Generate LiveKit Token
        const apiKey = Deno.env.get('LIVEKIT_API_KEY')
        const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')

        if (!apiKey || !apiSecret) {
            throw new Error('LiveKit configuration is missing on server.')
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: user.id,
            name: username,
        })

        at.addGrant({
            roomJoin: true,
            room: spaceId,
            canPublish: role !== 'viewer',
            canSubscribe: true,
            canPublishData: true, // For low-bandwidth data messages
        })

        return new Response(
            JSON.stringify({
                token: at.toJwt(),
                wsUrl: Deno.env.get('LIVEKIT_WS_URL')
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
