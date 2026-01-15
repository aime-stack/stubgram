import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');

console.log('--- Carousel Support Migration ---');

const envContent = fs.readFileSync(envPath, 'utf-8');
const connectionLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));

if (!connectionLine) {
    console.error('DATABASE_URL not found');
    process.exit(1);
}

const connectionString = connectionLine.split('=')[1].trim();
const sql = postgres(connectionString, { ssl: 'require' });

async function main() {
    try {
        await sql`
            ALTER TABLE public.posts 
            ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb
        `;
        console.log('✅ media_urls column added');

        await sql`
            CREATE INDEX IF NOT EXISTS idx_posts_media_urls 
            ON public.posts USING GIN (media_urls)
        `;
        console.log('✅ Index created');

        console.log('🚀 Carousel migration complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

main();
