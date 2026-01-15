
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');

console.log('--- Manual Env Verification ---');
console.log('Reading:', envPath);

const envContent = fs.readFileSync(envPath, 'utf-8');
const connectionLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));

if (!connectionLine) {
    console.error('DATABASE_URL not found in file directly');
    process.exit(1);
}

const connectionString = connectionLine.split('=')[1].trim();
console.log('Connection String (Direct Read):', connectionString.replace(/:[^:]*@/, ':****@')); // Redact password

const sql = postgres(connectionString);

async function check() {
    try {
        const result = await sql`SELECT version()`;
        console.log('✅ Database connected:', result[0].version);
        
        // Now check columns
         const postColumns = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'posts';
        `;
        const hasAspectRatio = postColumns.some(c => c.column_name === 'aspect_ratio');
        console.log('Has aspect_ratio?', hasAspectRatio);

        const profilesColumns = await sql`
             SELECT column_name 
             FROM information_schema.columns 
             WHERE table_name = 'profiles';
        `;
        const hasAccountType = profilesColumns.some(c => c.column_name === 'account_type');
        console.log('Has account_type?', hasAccountType);

        process.exit(0);
    } catch (e) {
        console.error('❌ Connection failed:', e);
        process.exit(1);
    }
}

check();
