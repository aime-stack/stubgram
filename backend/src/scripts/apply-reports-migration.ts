import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');
const sqlFilePath = path.resolve(__dirname, '../../../supabase/add_reports_table.sql');

console.log('--- Applying Reports Table Migration ---');

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

        await sql.unsafe(sqlContent);

        console.log('✅ Reports table migration applied successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to apply migration:', error);
        process.exit(1);
    }
}

main();
