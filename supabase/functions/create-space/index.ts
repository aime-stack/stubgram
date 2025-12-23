import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get user from auth header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('No authorization header')

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
            authHeader.replace('Bearer ', '')
        )
        if (userError || !user) throw new Error('Unauthorized')

        const { title, type, description, isAudioOnly = true } = await req.json()

        if (!title) throw new Error('Title is required')

        // 1. Rate Limiting: Max 5 active spaces per user
        const { count, error: countError } = await supabaseClient
            .from('video_spaces')
            .select('*', { count: 'exact', head: true })
            .eq('host_id', user.id)
            .in('status', ['created', 'live'])

        if (countError) throw countError
        if (count && count >= 5) {
            return new Response(
                JSON.stringify({ error: 'Rate limit exceeded: You can only have 5 active spaces at a time.' }),
                { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Generate invite code for invite-only spaces
        const inviteCode = type === 'invite'
            ? Math.random().toString(36).substring(2, 10).toUpperCase()
            : null

        // 3. Create space
        const { data: space, error: spaceError } = await supabaseClient
            .from('video_spaces')
            .insert({
                host_id: user.id,
                title,
                description,
                type,
                is_audio_only: isAudioOnly,
                invite_code: inviteCode,
                status: 'created'
            })
            .select()
            .single()

        if (spaceError) throw spaceError

        return new Response(
            JSON.stringify(space),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
