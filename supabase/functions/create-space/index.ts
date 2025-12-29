console.log('[create-space] Module loading...');
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    console.log('[create-space] Invoked');
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log('[create-space] Creating Supabase client');
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

        const body = await req.json()
        console.log('[create-space] Request body:', JSON.stringify(body));

        const { title, type, description, isAudioOnly, is_audio_only } = body
        const finalIsAudioOnly = is_audio_only !== undefined ? is_audio_only : (isAudioOnly !== undefined ? isAudioOnly : true);

        if (!title) throw new Error('Title is required')

        // 1. Rate Limiting: Max 5 active spaces per user
        const { count, error: countError } = await supabaseClient
            .from('video_spaces')
            .select('*', { count: 'exact', head: true })
            .eq('host_id', user.id)
            .in('status', ['created', 'live'])

        if (countError) throw countError
        if (count && count >= 5) {
            console.warn(`[create-space] Rate limit hit for user ${user.id}. Current count: ${count}`);
            return new Response(
                JSON.stringify({ 
                    error: 'Rate limit exceeded',
                    message: `You already have ${count} active spaces. Please end an existing space before creating a new one.`,
                    count
                }),
                { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Generate invite code for invite-only spaces
        const inviteCode = type === 'invite'
            ? Math.random().toString(36).substring(2, 10).toUpperCase()
            : null

        // 3. Create space
        console.log('[create-space] Inserting space into DB...');
        const { data: space, error: spaceError } = await supabaseClient
            .from('video_spaces')
            .insert({
                host_id: user.id,
                title,
                description,
                type,
                is_audio_only: finalIsAudioOnly,
                invite_code: inviteCode,
                status: 'live'
            })
            .select()
            .single()

        if (spaceError) {
            console.error('[create-space] DB Insert Error:', spaceError);
            throw spaceError;
        }

        console.log('[create-space] Space created successfully:', space.id);
        return new Response(
            JSON.stringify(space),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: unknown) {
        console.error('[create-space] Catch Block Error:', error);
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
