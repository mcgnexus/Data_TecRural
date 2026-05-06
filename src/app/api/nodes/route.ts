import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';

const NodeSchema = z.object({
  node_code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  location_name: z.string().min(1).max(100),
  crop: z.string().min(1).max(50),
  wifi_ssid: z.string().min(1).max(50),
  wifi_password: z.string().min(8).max(50),
  api_token: z.string().min(8).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = NodeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const nodeData = validation.data;

    // Check if node_code already exists
    const existingNode = await sql`
      SELECT id FROM nodes WHERE node_code = ${nodeData.node_code} LIMIT 1
    `;

    if (existingNode.length > 0) {
      return NextResponse.json(
        { ok: false, error: 'El código de nodo ya existe' },
        { status: 409 }
      );
    }

    // Insert new node
    const result = await sql`
      INSERT INTO nodes (
        node_code,
        name,
        location_name,
        crop,
        wifi_ssid,
        wifi_password,
        api_token
      )
      VALUES (
        ${nodeData.node_code},
        ${nodeData.name},
        ${nodeData.location_name},
        ${nodeData.crop},
        ${nodeData.wifi_ssid},
        ${nodeData.wifi_password},
        ${nodeData.api_token}
      )
      RETURNING id, node_code
    `;

    return NextResponse.json(
      {
        ok: true,
        node: result[0]
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in /api/nodes:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}