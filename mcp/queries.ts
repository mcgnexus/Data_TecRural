import { sql } from './db.js';
import type { Reading } from './diagnostics.js';

export type NodeRecord = {
  id: string;
  node_code: string;
  name: string | null;
  location_name: string | null;
  crop: string | null;
  active: boolean;
  created_at: string;
};

export async function listActiveNodes(): Promise<NodeRecord[]> {
  const result = await sql`
    SELECT id, node_code, name, location_name, crop, active, created_at
    FROM nodes
    WHERE active = true
    ORDER BY node_code ASC
  `;

  return result as NodeRecord[];
}

export async function getNode(nodeCode: string): Promise<NodeRecord | null> {
  const result = await sql`
    SELECT id, node_code, name, location_name, crop, active, created_at
    FROM nodes
    WHERE node_code = ${nodeCode}
    LIMIT 1
  `;

  return (result[0] as NodeRecord | undefined) ?? null;
}

export async function getLatestReading(nodeCode: string): Promise<Reading | null> {
  const result = await sql`
    SELECT
      sr.id,
      sr.node_id,
      sr.measured_at,
      sr.air_temp_c,
      sr.air_humidity_pct,
      sr.pressure_hpa,
      sr.leaf_temp_c,
      sr.soil_moisture_raw,
      sr.soil_moisture_pct,
      sr.battery_v,
      sr.rssi_dbm,
      sr.created_at,
      n.node_code
    FROM sensor_readings sr
    JOIN nodes n ON sr.node_id = n.id
    WHERE n.node_code = ${nodeCode}
    ORDER BY sr.measured_at DESC
    LIMIT 1
  `;

  return (result[0] as Reading | undefined) ?? null;
}

export async function getRecentReadings(nodeCode: string, limit: number): Promise<Reading[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const result = await sql`
    SELECT
      sr.id,
      sr.node_id,
      sr.measured_at,
      sr.air_temp_c,
      sr.air_humidity_pct,
      sr.pressure_hpa,
      sr.leaf_temp_c,
      sr.soil_moisture_raw,
      sr.soil_moisture_pct,
      sr.battery_v,
      sr.rssi_dbm,
      sr.created_at,
      n.node_code
    FROM sensor_readings sr
    JOIN nodes n ON sr.node_id = n.id
    WHERE n.node_code = ${nodeCode}
    ORDER BY sr.measured_at DESC
    LIMIT ${safeLimit}
  `;

  return result as Reading[];
}
