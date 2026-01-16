import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');
const sqlFilePath = path.resolve(__dirname, '../../../supabase/fix_award_points.sql');

console.log('--- Applying award_points Fix ---');

// Load .env
if (!fs.existsSync(envPath)) {
    console.error('.env file not found at', envPath);
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const connectionLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));

if (!connectionLine) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

const connectionString = connectionLine.split('=')[1].trim();
const sql = postgres(connectionString, {
    connect_timeout: 10,
    ssl: 'require'
});

async function main() {
    try {
        if (!fs.existsSync(sqlFilePath)) {
            console.error('SQL file not found at', sqlFilePath);
            process.exit(1);
        }

        const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
        console.log('Executing SQL from', sqlFilePath);

        // Split by semicolon and filtered for non-empty statements
        // NOTE: This is a simple splitter and might fail on complex SQL with internal semicolons (like in DO blocks)
        // However, for this fix, we can try running it as one big block if the driver supports multiple statements.
        // Or better yet, just run the whole content if postgres.js allows.
        
        await sql.unsafe(sqlContent);

        console.log('✅ award_points fix applied successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to apply fix:', error);
        process.exit(1);
    }
}

main();
