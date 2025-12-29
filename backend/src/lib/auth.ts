import { FastifyRequest } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function authMiddleware(request: FastifyRequest) {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Allow unauthenticated requests, use default user
        (request as any).user = { id: '00000000-0000-0000-0000-000000000000' };
        return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            (request as any).user = { id: '00000000-0000-0000-0000-000000000000' };
            return;
        }

        (request as any).user = { id: data.user.id };
    } catch (error) {
        console.error('Auth middleware error:', error);
        (request as any).user = { id: '00000000-0000-0000-0000-000000000000' };
    }
}
