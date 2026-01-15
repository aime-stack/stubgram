import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');
const sqlPath = path.resolve(__dirname, 'phase4_ecosystem.sql');

console.log('--- Phase 4: Ecosystem Migration ---');

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
        const migrationSql = fs.readFileSync(sqlPath, 'utf-8');
        await sql.unsafe(migrationSql);
        console.log('✅ Phase 4 Schema Applied Successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

main();
