import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');

console.log('--- V2 Migration: Loading Env ---');
console.log('Reading:', envPath);

// Manual Load
const envContent = fs.readFileSync(envPath, 'utf-8');
const connectionLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));

if (!connectionLine) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

const connectionString = connectionLine.split('=')[1].trim();
// console.log('Target DB:', connectionString.split('@')[1]); 

const sql = postgres(connectionString, {
    connect_timeout: 10,
    ssl: 'require'
});

async function main() {
    console.log('Applying V2 Migration...');

    try {
        await sql.begin(async sql => {
            // 1. Media Metadata
            await sql`ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS aspect_ratio FLOAT DEFAULT 1.0`;
            await sql`ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS original_metadata JSONB DEFAULT '{}'::jsonb`;
            await sql`ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS processing_error TEXT`;
            console.log('✅ Media columns added');

            // 2. Account Type
             // Check if column exists first to avoid error block issues in simpler clients, but postgres.js handles idempotent updates well via SQL logic
            await sql`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_type') THEN
                        ALTER TABLE public.profiles ADD COLUMN account_type TEXT DEFAULT 'regular' CHECK (account_type IN ('regular', 'vip', 'industry'));
                    END IF;
                END $$;
            `;
            console.log('✅ Account type added');

            // 3. Points Ledger
            await sql`
                CREATE TABLE IF NOT EXISTS public.points_ledger (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
                    amount INTEGER NOT NULL,
                    reason TEXT NOT NULL,
                    source_id TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `;
            await sql`ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY`;
            
            // Drop policy if exists (safe way)
            await sql`DROP POLICY IF EXISTS "Users view own points" ON public.points_ledger`;
            await sql`CREATE POLICY "Users view own points" ON public.points_ledger FOR SELECT USING (auth.uid() = user_id)`;
            console.log('✅ Points Ledger table created');

            // 4. Wallet Column
            await sql`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0`;
            console.log('✅ Coins column added to profiles');

            // 5. Functions & Triggers (Split to avoid parsing issues)
            
            // Award Points Function
            await sql`
                CREATE OR REPLACE FUNCTION public.award_points(p_user_id UUID, p_amount INTEGER, p_reason TEXT, p_source_id TEXT)
                RETURNS VOID AS $$
                BEGIN
                    INSERT INTO public.points_ledger (user_id, amount, reason, source_id)
                    VALUES (p_user_id, p_amount, p_reason, p_source_id);

                    UPDATE public.profiles
                    SET coins = coins + p_amount
                    WHERE id = p_user_id;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // Post Trigger
            await sql`
                CREATE OR REPLACE FUNCTION public.handle_new_post_points()
                RETURNS TRIGGER AS $$
                BEGIN
                    PERFORM public.award_points(NEW.user_id, 10, 'Create Post', NEW.id::text);
                    RETURN NULL;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;
            await sql`DROP TRIGGER IF EXISTS on_post_created_points ON public.posts`;
            await sql`CREATE TRIGGER on_post_created_points AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.handle_new_post_points()`;

            // Comment Trigger
            await sql`
                CREATE OR REPLACE FUNCTION public.handle_new_comment_points()
                RETURNS TRIGGER AS $$
                BEGIN
                    PERFORM public.award_points(NEW.user_id, 5, 'Commented', NEW.id::text);
                    RETURN NULL;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;
            await sql`DROP TRIGGER IF EXISTS on_comment_created_points ON public.comments`;
            await sql`CREATE TRIGGER on_comment_created_points AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment_points()`;

            // Like Trigger
            await sql`
                CREATE OR REPLACE FUNCTION public.handle_new_like_points()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF NEW.user_id != (SELECT user_id FROM public.posts WHERE id = NEW.post_id) THEN
                        PERFORM public.award_points(NEW.user_id, 5, 'Liked a post', NEW.post_id::text);
                    END IF;
                    RETURN NULL;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;
            await sql`DROP TRIGGER IF EXISTS on_like_created_points ON public.likes`;
            await sql`CREATE TRIGGER on_like_created_points AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION public.handle_new_like_points()`;

            console.log('✅ Triggers applied');
        });

        console.log('🚀 Migration successful');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

main();
