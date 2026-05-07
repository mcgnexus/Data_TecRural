# Instrucciones MCP para OpenClaw

Este documento describe como conectar OpenClaw al servidor MCP remoto de Data TecRural para consultar nodos, lecturas IoT, diagnosticar alertas y generar resúmenes agronómicos con datos reales.

## Endpoint

```text
http://TU_VPS_O_DOMINIO:3030/mcp
```

Si usas proxy inverso con HTTPS:

```text
https://mcp.tu-dominio.com/mcp
```

## Autenticación

Todas las peticiones MCP deben incluir este header:

```http
Authorization: Bearer TU_MCP_READ_TOKEN
```

El valor debe coincidir con la variable de entorno del servidor:

```env
MCP_READ_TOKEN="TU_MCP_READ_TOKEN"
```

No compartas este token con usuarios finales ni lo incluyas en código frontend.

## Variables Del Servidor MCP

En el VPS donde corre Data TecRural:

```env
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
MCP_HOST="0.0.0.0"
MCP_PORT="3030"
MCP_READ_TOKEN="token-largo-secreto-para-openclaw"
```

Si usas Nginx, Caddy u otro proxy inverso, es preferible escuchar solo localmente:

```env
MCP_HOST="127.0.0.1"
MCP_PORT="3030"
```

## Ejecutar El Servidor

```bash
npm install
npm run mcp
```

Health check:

```bash
curl http://TU_VPS_O_DOMINIO:3030/health
```

Respuesta esperada:

```json
{
  "ok": true,
  "service": "data-tecrural-mcp"
}
```

## Herramientas Disponibles

### `list_active_nodes`

Lista nodos activos registrados.

No expone:

- `api_token`
- `wifi_ssid`
- `wifi_password`

Uso recomendado:

```text
Lista los nodos activos disponibles para generar un informe agrícola.
```

### `get_latest_reading`

Obtiene la última lectura de un nodo.

Entrada:

```json
{
  "node_code": "TR-FITO-001"
}
```

Uso recomendado:

```text
Consulta la última lectura del nodo TR-FITO-001 y explica el estado actual del cultivo.
```

### `get_recent_readings`

Obtiene lecturas recientes de un nodo.

Entrada:

```json
{
  "node_code": "TR-FITO-001",
  "limit": 100
}
```

Notas:

- `limit` es opcional.
- Valor por defecto: `100`.
- Máximo permitido: `500`.

Uso recomendado:

```text
Analiza las últimas 100 lecturas del nodo TR-FITO-001 e identifica tendencias de humedad de suelo y temperatura.
```

### `get_node_status`

Devuelve estado operacional del nodo.

Entrada:

```json
{
  "node_code": "TR-FITO-001"
}
```

Incluye:

- datos públicos del nodo
- última lectura
- minutos desde el último reporte
- indicador `online`

Uso recomendado:

```text
Revisa si el nodo TR-FITO-001 está operativo y si ha reportado recientemente.
```

### `diagnose_node`

Genera alertas básicas a partir de la última lectura.

Entrada:

```json
{
  "node_code": "TR-FITO-001"
}
```

Detecta:

- batería baja o crítica
- señal WiFi débil
- humedad de suelo baja o alta
- temperatura foliar alta
- humedad ambiental baja
- nodo atrasado o sin reportar

Uso recomendado:

```text
Diagnostica el nodo TR-FITO-001 y prioriza las alertas para el técnico de campo.
```

### `summarize_agronomic_conditions`

Genera un resumen base con datos reales para informes de un LLM.

Entrada:

```json
{
  "node_code": "TR-FITO-001"
}
```

Uso recomendado:

```text
Genera un informe agronómico breve para el nodo TR-FITO-001 usando los datos reales disponibles.
```

## Umbrales De Alerta

- Batería crítica: `battery_v < 3.2`
- Batería baja: `battery_v < 3.4`
- Señal WiFi débil: `rssi_dbm < -80`
- Humedad de suelo baja: `soil_moisture_pct < 25`
- Humedad de suelo alta: `soil_moisture_pct > 80`
- Temperatura foliar alta: `leaf_temp_c > 35`
- Humedad ambiental baja: `air_humidity_pct < 35`
- Nodo atrasado: más de 6 horas sin reportar
- Nodo sin reportar: más de 24 horas sin reportar

## Flujo Recomendado Para Informes

Para un informe diario por nodo:

1. Llamar `get_node_status`.
2. Llamar `get_recent_readings` con `limit: 100`.
3. Llamar `diagnose_node`.
4. Llamar `summarize_agronomic_conditions`.
5. Redactar informe con resumen, alertas, tendencias y acciones sugeridas.

## Flujo Recomendado Para Alertas

Para revisar alertas periódicas:

1. Llamar `list_active_nodes`.
2. Para cada nodo, llamar `diagnose_node`.
3. Clasificar alertas por severidad: `critical`, `warning`, `info`.
4. Notificar primero baterías críticas y nodos sin reportar.

## Seguridad Recomendada

- Publicar el MCP solo por HTTPS.
- Usar un token largo y aleatorio en `MCP_READ_TOKEN`.
- No exponer el MCP directamente sin firewall si no es necesario.
- No poner `MCP_READ_TOKEN` en frontend.
- Rotar el token si se comparte accidentalmente.

## Alcance Actual

Este MCP es de solo lectura.

No permite:

- crear nodos
- rotar tokens de nodos
- modificar WiFi
- desactivar nodos
- insertar lecturas

Esas acciones deben mantenerse fuera del agente hasta implementar permisos administrativos separados.
