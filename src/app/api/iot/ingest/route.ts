import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { IoTReadingSchema } from '@/lib/iotValidation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = IoTReadingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid data' },
        { status: 400 }
      );
    }

    const payload = validationResult.data;

    const nodes = await sql`
      SELECT id, api_token, active
      FROM nodes
      WHERE node_code = ${payload.node_code}
      LIMIT 1
    `;

    if (!nodes || nodes.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const node = nodes[0];

    if (!node.active) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (node.api_token !== payload.token) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const measuredAt = payload.measured_at ? new Date(payload.measured_at) : null;

    const sanitizedRaw = {
      air_temp_c: payload.air_temp_c,
      air_humidity_pct: payload.air_humidity_pct,
      pressure_hpa: payload.pressure_hpa,
      leaf_temp_c: payload.leaf_temp_c,
      soil_moisture_raw: payload.soil_moisture_raw,
      soil_moisture_pct: payload.soil_moisture_pct,
      battery_v: payload.battery_v,
      rssi_dbm: payload.rssi_dbm
    };

    const result = await sql`
      INSERT INTO sensor_readings (
        node_id,
        measured_at,
        air_temp_c,
        air_humidity_pct,
        pressure_hpa,
        leaf_temp_c,
        soil_moisture_raw,
        soil_moisture_pct,
        battery_v,
        rssi_dbm,
        raw
      )
      VALUES (
        ${node.id},
        ${measuredAt},
        ${payload.air_temp_c ?? null},
        ${payload.air_humidity_pct ?? null},
        ${payload.pressure_hpa ?? null},
        ${payload.leaf_temp_c ?? null},
        ${payload.soil_moisture_raw ?? null},
        ${payload.soil_moisture_pct ?? null},
        ${payload.battery_v ?? null},
        ${payload.rssi_dbm ?? null},
        ${JSON.stringify(sanitizedRaw)}::jsonb
      )
      RETURNING id, created_at
    `;

    const reading = result[0];

    return NextResponse.json(
      {
        ok: true,
        reading_id: reading.id,
        received_at: reading.created_at
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.IOT_API_DEBUG === 'true') {
      console.error('Error in /api/iot/ingest:', error);
    }
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
