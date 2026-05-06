import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';

const NodeCodeSchema = z.string()
  .min(1, 'node_code is required')
  .max(50, 'node_code too long')
  .regex(/^[A-Za-z0-9\-_]+$/, 'Invalid node_code');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nodeCode = searchParams.get('node_code');

    if (!nodeCode) {
      return NextResponse.json(
        { ok: false, error: 'node_code is required' },
        { status: 400 }
      );
    }

    const nodeCodeValidation = NodeCodeSchema.safeParse(nodeCode);
    if (!nodeCodeValidation.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid node_code' },
        { status: 400 }
      );
    }

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
      WHERE n.node_code = ${nodeCodeValidation.data}
      ORDER BY sr.measured_at DESC
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { ok: false, data: null },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: result[0]
      }
    );
  } catch (error) {
    if (process.env.IOT_API_DEBUG === 'true') {
      console.error('Error in /api/iot/latest:', error);
    }
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}