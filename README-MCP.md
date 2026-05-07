# MCP remoto para Data TecRural

Este servidor MCP expone herramientas de solo lectura para que un agente remoto, como OpenClaw en un VPS, pueda consultar datos IoT, diagnosticar nodos y generar resúmenes agronómicos con datos reales.

## Arquitectura

```text
OpenClaw / agente LLM -> MCP HTTP /mcp -> Neon PostgreSQL
ESP32 -> /api/iot/ingest -> Neon PostgreSQL
```

El MCP no reemplaza la API IoT. Los ESP32 deben seguir enviando lecturas a `/api/iot/ingest`.

## Variables de entorno

```env
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
MCP_HOST="0.0.0.0"
MCP_PORT="3030"
MCP_READ_TOKEN="token-largo-secreto-para-openclaw"
```

`MCP_READ_TOKEN` es obligatorio porque el servidor está pensado para acceso por red.

## Ejecutar localmente o en VPS

```bash
npm install
npm run mcp
```

Endpoint MCP:

```text
http://TU_HOST:3030/mcp
```

Health check:

```bash
curl http://TU_HOST:3030/health
```

Las peticiones MCP deben incluir:

```http
Authorization: Bearer token-largo-secreto-para-openclaw
```

## Herramientas disponibles

- `list_active_nodes`: lista nodos activos sin exponer `api_token`, `wifi_ssid` ni `wifi_password`.
- `get_latest_reading`: obtiene la última lectura de un nodo.
- `get_recent_readings`: obtiene lecturas recientes, con límite máximo de 500.
- `get_node_status`: devuelve estado operacional básico del nodo.
- `diagnose_node`: genera alertas básicas de batería, señal, humedad, temperatura y nodo sin reportar.
- `summarize_agronomic_conditions`: genera un resumen base para informes con LLM.

## Reglas iniciales de alerta

- Batería crítica: `battery_v < 3.2`
- Batería baja: `battery_v < 3.4`
- Señal WiFi débil: `rssi_dbm < -80`
- Humedad de suelo baja: `soil_moisture_pct < 25`
- Humedad de suelo alta: `soil_moisture_pct > 80`
- Temperatura foliar alta: `leaf_temp_c > 35`
- Humedad ambiental baja: `air_humidity_pct < 35`
- Nodo atrasado: más de 6 horas sin reportar
- Nodo sin reportar: más de 24 horas sin reportar

## Exposición segura

Para producción, publica el MCP detrás de HTTPS y restringe el puerto con firewall o proxy inverso. No expongas este servicio sin `MCP_READ_TOKEN`.

Ejemplo conceptual con proxy:

```text
https://mcp.tu-dominio.com/mcp -> http://127.0.0.1:3030/mcp
```

En ese caso puedes ejecutar con:

```env
MCP_HOST="127.0.0.1"
MCP_PORT="3030"
```
