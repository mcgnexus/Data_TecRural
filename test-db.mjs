import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
console.log('DATABASE_URL exists:', !!databaseUrl);
console.log('DATABASE_URL prefix:', databaseUrl?.substring(0, 30) + '...');

try {
  const sql = neon(databaseUrl);
  console.log('Creating sql object... OK');
  
  const result = await sql`SELECT 1 as test`;
  console.log('Query result:', result);
  
  const nodes = await sql`SELECT id, node_code, active FROM nodes WHERE node_code = 'TR-FITO-001' LIMIT 1`;
  console.log('Nodes found:', nodes.length);
  console.log('Node data:', JSON.stringify(nodes, null, 2));
} catch (error) {
  console.error('Error:', error.message);
  console.error('Full error:', error);
}