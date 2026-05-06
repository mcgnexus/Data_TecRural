import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const sql = neon(databaseUrl);

console.log('Adding WiFi columns to nodes table...');

try {
  await sql`ALTER TABLE nodes ADD COLUMN IF NOT EXISTS wifi_ssid text`;
  await sql`ALTER TABLE nodes ADD COLUMN IF NOT EXISTS wifi_password text`;
  console.log('✅ WiFi columns added');
} catch (error) {
  console.log('Columns might already exist:', error instanceof Error ? error.message : String(error));
}

console.log('Verifying tables...');
const nodes = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'nodes'`;
console.log('Nodes columns:', nodes.map(c => c.column_name).join(', '));
