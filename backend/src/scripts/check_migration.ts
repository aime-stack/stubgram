
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

const sql = postgres(connectionString);

async function check() {
    console.log('--- Checking Schema State ---');
    
    // Check Posts columns
    const postColumns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'posts';
    `;
    console.log('Posts Columns:', postColumns.map(c => c.column_name).filter(c => ['aspect_ratio', 'media_metadata', 'original_metadata'].includes(c)));

    // Check Profiles columns
    const profileColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'profiles';
    `;
    console.log('Profiles Columns:', profileColumns.map(c => c.column_name).filter(c => ['coins', 'account_type'].includes(c)));

    // Check Points Ledger table
    const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'points_ledger';
    `;
    console.log('Tables found:', tables.map(t => t.table_name));

    process.exit(0);
}

check();
