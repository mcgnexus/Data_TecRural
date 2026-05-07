# Uso De La API REST Para Una App Web Externa

Este documento describe como una app web externa puede consumir la API REST de Data TecRural para consultar lecturas IoT, listar datos recientes y registrar nodos.

## Base URL

Producción:

```text
https://TU_DOMINIO.vercel.app
```

Local:

```text
http://localhost:3000
```

Todos los ejemplos usan JSON.

## Endpoints Disponibles

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/api/iot/ingest` | Recibir lecturas desde nodos ESP32 |
| `GET` | `/api/iot/latest` | Consultar última lectura de un nodo |
| `GET` | `/api/iot/readings` | Consultar histórico reciente de un nodo |
| `POST` | `/api/nodes` | Registrar un nuevo nodo |

## Consultar Última Lectura

```http
GET /api/iot/latest?node_code=TR-FITO-001
```

Ejemplo con `fetch`:

```ts
const response = await fetch('https://TU_DOMINIO.vercel.app/api/iot/latest?node_code=TR-FITO-001');
const data = await response.json();
```

Respuesta exitosa:

```json
{
  "ok": true,
  "data": {
    "id": 1,
    "node_id": "uuid",
    "node_code": "TR-FITO-001",
    "measured_at": "2026-05-06T10:30:00.000Z",
    "air_temp_c": "24.60",
    "air_humidity_pct": "48.20",
    "pressure_hpa": "921.40",
    "leaf_temp_c": "27.10",
    "soil_moisture_raw": 1840,
    "soil_moisture_pct": "36.50",
    "battery_v": "3.92",
    "rssi_dbm": -67,
    "created_at": "2026-05-06T10:30:00.123Z"
  }
}
```

Errores posibles:

| Código | Significado |
|---|---|
| `400` | Falta `node_code` o tiene formato inválido |
| `404` | No hay lecturas para ese nodo |
| `500` | Error interno del servidor |

## Consultar Histórico De Lecturas

```http
GET /api/iot/readings?node_code=TR-FITO-001&limit=100
```

Parámetros:

| Parámetro | Requerido | Descripción |
|---|---:|---|
| `node_code` | Sí | Código del nodo |
| `limit` | No | Número de lecturas. Default: `100`. Máximo: `500` |

Ejemplo con `fetch`:

```ts
const params = new URLSearchParams({
  node_code: 'TR-FITO-001',
  limit: '100'
});

const response = await fetch(`https://TU_DOMINIO.vercel.app/api/iot/readings?${params}`);
const data = await response.json();
```

Respuesta exitosa:

```json
{
  "ok": true,
  "data": [],
  "count": 0
}
```

## Enviar Lectura IoT

Este endpoint está pensado principalmente para ESP32 u otros dispositivos IoT.

```http
POST /api/iot/ingest
Content-Type: application/json
```

Body:

```json
{
  "node_code": "TR-FITO-001",
  "token": "token-del-nodo",
  "air_temp_c": 24.6,
  "air_humidity_pct": 48.2,
  "pressure_hpa": 921.4,
  "leaf_temp_c": 27.1,
  "soil_moisture_raw": 1840,
  "soil_moisture_pct": 36.5,
  "battery_v": 3.92,
  "rssi_dbm": -67,
  "measured_at": "2026-05-06T10:30:00Z"
}
```

Campos obligatorios:

- `node_code`
- `token`

Campos opcionales:

- `air_temp_c`
- `air_humidity_pct`
- `pressure_hpa`
- `leaf_temp_c`
- `soil_moisture_raw`
- `soil_moisture_pct`
- `battery_v`
- `rssi_dbm`
- `measured_at`

Ejemplo con `fetch`:

```ts
const response = await fetch('https://TU_DOMINIO.vercel.app/api/iot/ingest', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    node_code: 'TR-FITO-001',
    token: 'token-del-nodo',
    air_temp_c: 24.6,
    air_humidity_pct: 48.2,
    soil_moisture_pct: 36.5,
    battery_v: 3.92,
    rssi_dbm: -67
  })
});

const data = await response.json();
```

Respuesta exitosa:

```json
{
  "ok": true,
  "reading_id": 1,
  "measured_at": "2026-05-06T10:30:00.000Z",
  "received_at": "2026-05-06T10:30:00.123Z"
}
```

Errores posibles:

| Código | Significado |
|---|---|
| `400` | Datos inválidos |
| `401` | Nodo inexistente, inactivo o token incorrecto |
| `500` | Error interno del servidor |

## Registrar Un Nodo

```http
POST /api/nodes
Content-Type: application/json
```

Body:

```json
{
  "node_code": "TR-FITO-001",
  "name": "Nodo Fitomonitoreo 001",
  "location_name": "Parcela Norte",
  "crop": "Tomate",
  "wifi_ssid": "NombreWiFi",
  "wifi_password": "password-seguro",
  "api_token": "token-largo-del-nodo"
}
```

Ejemplo con `fetch`:

```ts
const response = await fetch('https://TU_DOMINIO.vercel.app/api/nodes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    node_code: 'TR-FITO-001',
    name: 'Nodo Fitomonitoreo 001',
    location_name: 'Parcela Norte',
    crop: 'Tomate',
    wifi_ssid: 'NombreWiFi',
    wifi_password: 'password-seguro',
    api_token: 'token-largo-del-nodo'
  })
});

const data = await response.json();
```

Respuesta exitosa:

```json
{
  "ok": true,
  "node": {
    "id": "uuid",
    "node_code": "TR-FITO-001"
  }
}
```

Errores posibles:

| Código | Significado |
|---|---|
| `400` | Datos inválidos |
| `409` | El código de nodo ya existe |
| `500` | Error interno del servidor |

## Validación De `node_code`

El código del nodo debe cumplir:

- mínimo 1 carácter
- máximo 50 caracteres
- solo letras, números, guion y guion bajo

Ejemplos válidos:

```text
TR-FITO-001
NODE_01
sensor-abc-123
```

## Recomendaciones Para Una App Web

- Usar la API REST para pantallas, dashboards y formularios.
- Usar el MCP para que un LLM/agente analice datos, genere informes o priorice alertas.
- No exponer tokens de nodos en el navegador.
- No guardar `api_token` ni credenciales WiFi en almacenamiento local del frontend.
- Crear un backend intermedio si la app web necesita acciones administrativas.

## REST Vs MCP

Usa REST cuando:

- una app web necesita mostrar datos
- un dashboard necesita gráficas
- un ESP32 necesita enviar lecturas
- necesitas integración simple con `fetch`

Usa MCP cuando:

- un agente LLM necesita consultar herramientas
- OpenClaw debe diagnosticar nodos
- quieres generar informes automáticos
- quieres priorizar alertas con lenguaje natural

## Ejemplo De Flujo Para Dashboard

1. La app web llama `/api/iot/readings` para cargar la gráfica.
2. La app web llama `/api/iot/latest` para mostrar el estado actual.
3. Si necesita informe inteligente, el backend o agente llama al MCP.
4. La app muestra el informe generado al usuario.
