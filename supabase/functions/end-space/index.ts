import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
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

        // 1. Verify user is the host
        const { data: space, error: spaceError } = await supabaseClient
            .from('video_spaces')
            .select('host_id')
            .eq('id', spaceId)
            .single()

        if (spaceError || !space) throw new Error('Space not found')
        if (space.host_id !== user.id) throw new Error('Only the host can end the space.')

        // 2. Update space status
        const { error: updateError } = await supabaseClient
            .from('video_spaces')
            .update({
                status: 'ended',
                ended_at: new Date().toISOString()
            })
            .eq('id', spaceId)

        if (updateError) throw updateError

        // 3. Mark all participants as left
        await supabaseClient
            .from('video_space_participants')
            .update({ left_at: new Date().toISOString() })
            .eq('space_id', spaceId)
            .is('left_at', null)

        // TODO: Optional - Call LiveKit API to close the room immediately
        // For now, setting status to 'ended' will prevent new tokens from being issued.

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
