import { sql } from '@/lib/db';
import { Node, SensorReading } from '@/types';
import DashboardClient from './DashboardClient';

interface DashboardProps {
  searchParams: Promise<{
    node_code?: string;
    start_date?: string;
    end_date?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const toNumberOrNull = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const params = await searchParams;
  
  const nodesResult = await sql`
    SELECT id, node_code, name, location_name, crop, active
    FROM nodes
    ORDER BY node_code
  `;

  const nodes = nodesResult as Node[];
  
  let readingsResult;
  
  if (params.node_code && params.start_date && params.end_date) {
    readingsResult = await sql`
      SELECT
        sr.id, sr.node_id, sr.measured_at, sr.air_temp_c, sr.air_humidity_pct,
        sr.pressure_hpa, sr.leaf_temp_c, sr.soil_moisture_raw, sr.soil_moisture_pct,
        sr.battery_v, sr.rssi_dbm, sr.created_at,
        n.node_code, n.name as node_name, n.location_name, n.crop, n.wifi_ssid
      FROM sensor_readings sr
      JOIN nodes n ON sr.node_id = n.id
      WHERE n.node_code = ${params.node_code}
        AND sr.measured_at >= ${params.start_date}
        AND sr.measured_at <= ${params.end_date}
      ORDER BY sr.measured_at DESC
    `;
  } else if (params.node_code) {
    readingsResult = await sql`
      SELECT
        sr.id, sr.node_id, sr.measured_at, sr.air_temp_c, sr.air_humidity_pct,
        sr.pressure_hpa, sr.leaf_temp_c, sr.soil_moisture_raw, sr.soil_moisture_pct,
        sr.battery_v, sr.rssi_dbm, sr.created_at,
        n.node_code, n.name as node_name, n.location_name, n.crop, n.wifi_ssid
      FROM sensor_readings sr
      JOIN nodes n ON sr.node_id = n.id
      WHERE n.node_code = ${params.node_code}
      ORDER BY sr.measured_at DESC
    `;
  } else {
    readingsResult = await sql`
      SELECT
        sr.id, sr.node_id, sr.measured_at, sr.air_temp_c, sr.air_humidity_pct,
        sr.pressure_hpa, sr.leaf_temp_c, sr.soil_moisture_raw, sr.soil_moisture_pct,
        sr.battery_v, sr.rssi_dbm, sr.created_at,
        n.node_code, n.name as node_name, n.location_name, n.crop, n.wifi_ssid
      FROM sensor_readings sr
      JOIN nodes n ON sr.node_id = n.id
      ORDER BY sr.measured_at DESC
    `;
  }

  const readings = (readingsResult as unknown as SensorReading[]).map((reading) => ({
    ...reading,
    air_temp_c: toNumberOrNull(reading.air_temp_c),
    air_humidity_pct: toNumberOrNull(reading.air_humidity_pct),
    pressure_hpa: toNumberOrNull(reading.pressure_hpa),
    leaf_temp_c: toNumberOrNull(reading.leaf_temp_c),
    soil_moisture_raw: toNumberOrNull(reading.soil_moisture_raw),
    soil_moisture_pct: toNumberOrNull(reading.soil_moisture_pct),
    battery_v: toNumberOrNull(reading.battery_v),
    rssi_dbm: toNumberOrNull(reading.rssi_dbm),
  }));

  return <DashboardClient nodes={nodes} readings={readings} filters={params} />;
}
