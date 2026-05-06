import { randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
const nodeCode = process.env.NODE_CODE;
const newApiToken = process.env.NEW_API_TOKEN || randomBytes(24).toString('hex');

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

if (!nodeCode) {
  throw new Error('NODE_CODE is not defined');
}

const sql = neon(databaseUrl);

const result = await sql`
  UPDATE nodes
  SET api_token = ${newApiToken}
  WHERE node_code = ${nodeCode}
  RETURNING id, node_code
`;

if (result.length === 0) {
  throw new Error(`Node not found for node_code=${nodeCode}`);
}

console.log('Token rotated successfully');
console.log(`node_code=${result[0].node_code}`);
console.log(`new_api_token=${newApiToken}`);
