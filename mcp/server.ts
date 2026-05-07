import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { diagnoseReading, minutesSince, summarizeReading } from './diagnostics.js';
import { getLatestReading, getNode, getRecentReadings, listActiveNodes } from './queries.js';

const host = process.env.MCP_HOST ?? '0.0.0.0';
const port = Number.parseInt(process.env.MCP_PORT ?? '3030', 10);
const readToken = process.env.MCP_READ_TOKEN;

if (!readToken) {
  throw new Error('MCP_READ_TOKEN is required for network access');
}

const NodeCodeSchema = z.string()
  .min(1)
  .max(50)
  .regex(/^[A-Za-z0-9\-_]+$/);

const LimitSchema = z.number().int().min(1).max(500).default(100);

function jsonContent(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

function createMcpServer() {
  const server = new McpServer({
    name: 'data-tecrural-mcp',
    version: '0.1.0'
  });

  server.registerTool(
    'list_active_nodes',
    {
      title: 'List active nodes',
      description: 'Lista nodos activos sin exponer tokens ni credenciales WiFi.'
    },
    async () => jsonContent({ ok: true, data: await listActiveNodes() })
  );

  server.registerTool(
    'get_latest_reading',
    {
      title: 'Get latest node reading',
      description: 'Obtiene la ultima lectura disponible de un nodo.',
      inputSchema: { node_code: NodeCodeSchema }
    },
    async ({ node_code }) => jsonContent({ ok: true, data: await getLatestReading(node_code) })
  );

  server.registerTool(
    'get_recent_readings',
    {
      title: 'Get recent node readings',
      description: 'Obtiene lecturas recientes de un nodo, con limite maximo de 500.',
      inputSchema: {
        node_code: NodeCodeSchema,
        limit: LimitSchema.optional()
      }
    },
    async ({ node_code, limit }) => {
      const data = await getRecentReadings(node_code, limit ?? 100);
      return jsonContent({ ok: true, data, count: data.length });
    }
  );

  server.registerTool(
    'get_node_status',
    {
      title: 'Get node status',
      description: 'Devuelve estado operacional basico de un nodo y su ultima lectura.',
      inputSchema: { node_code: NodeCodeSchema }
    },
    async ({ node_code }) => {
      const node = await getNode(node_code);
      const latest = await getLatestReading(node_code);

      return jsonContent({
        ok: true,
        data: {
          node,
          latest_reading: latest,
          minutes_since_last_report: latest ? minutesSince(latest.measured_at) : null,
          online: latest ? minutesSince(latest.measured_at) <= 6 * 60 : false
        }
      });
    }
  );

  server.registerTool(
    'diagnose_node',
    {
      title: 'Diagnose node',
      description: 'Detecta alertas basicas: bateria, senal, humedad, temperatura y nodo sin reportar.',
      inputSchema: { node_code: NodeCodeSchema }
    },
    async ({ node_code }) => {
      const latest = await getLatestReading(node_code);
      const alerts = diagnoseReading(latest);

      return jsonContent({
        ok: true,
        data: {
          node_code,
          latest_reading: latest,
          alerts,
          alert_count: alerts.length
        }
      });
    }
  );

  server.registerTool(
    'summarize_agronomic_conditions',
    {
      title: 'Summarize agronomic conditions',
      description: 'Genera un resumen base con datos reales para informes de un LLM.',
      inputSchema: { node_code: NodeCodeSchema }
    },
    async ({ node_code }) => {
      const latest = await getLatestReading(node_code);
      const alerts = diagnoseReading(latest);

      return jsonContent({
        ok: true,
        data: {
          node_code,
          latest_reading: latest,
          alerts,
          summary: summarizeReading(latest, alerts)
        }
      });
    }
  );

  return server;
}

function isAuthorized(request: IncomingMessage): boolean {
  return request.headers.authorization === `Bearer ${readToken}`;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

const httpServer = createServer(async (request, response) => {
  if (request.url === '/health') {
    sendJson(response, 200, { ok: true, service: 'data-tecrural-mcp' });
    return;
  }

  if (!request.url?.startsWith('/mcp')) {
    sendJson(response, 404, { ok: false, error: 'Not found' });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { ok: false, error: 'Unauthorized' });
    return;
  }

  try {
    const mcpServer = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    response.on('close', () => {
      void transport.close();
      void mcpServer.close();
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(request, response);
  } catch (error) {
    console.error('MCP request failed:', error);
    if (!response.headersSent) {
      sendJson(response, 500, { ok: false, error: 'Internal server error' });
    }
  }
});

httpServer.listen(port, host, () => {
  console.log(`Data TecRural MCP listening on http://${host}:${port}/mcp`);
});
