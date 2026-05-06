# API IoT para Fitomonitoreo Agrícola

Esta API permite que nodos ESP32 envíen datos de sensores mediante HTTPS POST y los almacene en una base de datos Neon PostgreSQL.

## Arquitectura

```
ESP32 → HTTPS POST /api/iot/ingest → validación → Neon PostgreSQL → app web/dashboard
```

## Configuración

### 1. Crear las tablas en Neon

Ejecuta el script `schema.sql` en tu base de datos Neon:

```bash
psql $DATABASE_URL -f sql/schema.sql
```

### 2. Insertar nodo de prueba

Ejecuta el script `seed.sql`:

```bash
psql $DATABASE_URL -f sql/seed.sql
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Reemplaza `DATABASE_URL` con tu URL de conexión de Neon:

```
DATABASE_URL="postgresql://tu_usuario:tu_password@tu-host/tu_db?sslmode=require"
IOT_API_DEBUG="false"
```

### 4. Configurar en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Añade `DATABASE_URL` con tu URL de Neon
4. Añade `IOT_API_DEBUG="false"`

## Endpoints

### POST /api/iot/ingest

Recibe datos de sensores desde el ESP32.

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "node_code": "TR-FITO-001",
  "token": "cambia-este-token-largo",
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

**Respuesta exitosa (201):**
```json
{
  "ok": true,
  "reading_id": 1,
  "measured_at": "2026-05-06T10:30:00.000Z",
  "received_at": "2026-05-06T10:30:00.123Z"
}
```

**Códigos de error:**
- `400`: Datos inválidos
- `401`: No autorizado (nodo no existe o token incorrecto)
- `500`: Error interno del servidor

### GET /api/iot/latest?node_code=TR-FITO-001

Obtiene la última lectura de un nodo.

**Respuesta exitosa:**
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "node_id": "uuid",
    "measured_at": "2026-05-06T10:30:00Z",
    "air_temp_c": 24.6,
    ...
  }
}
```

### GET /api/iot/readings?node_code=TR-FITO-001&limit=100

Obtiene lecturas recientes de un nodo.

**Parámetros:**
- `node_code` (obligatorio): código del nodo
- `limit` (opcional, default: 100, máximo: 500): número de lecturas

**Respuesta exitosa:**
```json
{
  "ok": true,
  "data": [...],
  "count": 50
}
```

## Pruebas

### Prueba con cURL

```bash
curl -X POST https://TU-DOMINIO.vercel.app/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "node_code": "TR-FITO-001",
    "token": "cambia-este-token-largo",
    "air_temp_c": 24.6,
    "air_humidity_pct": 48.2,
    "pressure_hpa": 921.4,
    "leaf_temp_c": 27.1,
    "soil_moisture_raw": 1840,
    "soil_moisture_pct": 36.5,
    "battery_v": 3.92,
    "rssi_dbm": -67
  }'
```

### Pruebas locales

1. Instala dependencias:
```bash
npm install
```

2. Ejecuta en modo desarrollo:
```bash
npm run dev
```

3. Prueba el endpoint local:
```bash
curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "node_code": "TR-FITO-001",
    "token": "cambia-este-token-largo",
    "air_temp_c": 24.6
  }'
```

4. Prueba sin `measured_at` (la API debe asignar `now()` en PostgreSQL):
```bash
curl -X POST http://localhost:3000/api/iot/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "node_code": "TR-FITO-001",
    "token": "cambia-este-token-largo",
    "air_temp_c": 24.6,
    "air_humidity_pct": 48.2
  }'
```

## Código ESP32

### Ejemplo de envío de datos

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* serverUrl = "https://TU-DOMINIO.vercel.app/api/iot/ingest";

void sendSensorData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    String payload = "{";
    payload += "\"node_code\":\"TR-FITO-001\",";
    payload += "\"token\":\"cambia-este-token-largo\",";
    payload += "\"air_temp_c\":" + String(airTemp) + ",";
    payload += "\"air_humidity_pct\":" + String(airHumidity) + ",";
    payload += "\"battery_v\":" + String(battery) + ",";
    payload += "\"rssi_dbm\":" + String(WiFi.RSSI());
    payload += "}";

    int httpResponseCode = http.POST(payload);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println(httpResponseCode);
      Serial.println(response);
    }

    http.end();
  }
}
```

## Seguridad

### Implementaciones de seguridad actuales

La API incluye las siguientes medidas de seguridad:

1. **Validación exhaustiva de entrada**: Todos los datos se validan con Zod antes de procesarse
2. **Protección contra SQL injection**: Uso de queries parametrizadas con el driver de Neon
3. **Sanitización de datos sensibles**: El token nunca se almacena en la columna `raw` ni aparece en logs o respuestas
4. **Control de rangos temporales**: `measured_at` limitado a 24 horas en pasado y 1 hora en futuro
5. **Validación de límites**: El parámetro `limit` está acotado entre 1 y 500
6. **Validación de node_code**: Formato regex y longitud máxima de 50 caracteres
7. **Validación de rangos de sensores**:
   - air_temp_c: -50°C a 60°C
   - air_humidity_pct: 0% a 100%
   - pressure_hpa: 800 a 1100 hPa
   - leaf_temp_c: -20°C a 70°C
   - soil_moisture_raw: 0 a 4095 (ADC de 12 bits)
   - soil_moisture_pct: 0% a 100%
   - battery_v: 2.5V a 6V
   - rssi_dbm: -120 a 0 dBm
8. **Logging condicional**: Solo se logean errores detallados cuando `IOT_API_DEBUG=true`
9. **Respuestas genéricas en producción**: Mensajes de error no exponen información interna
10. **Multi-nodo seguro**: Cada nodo tiene autenticación independiente

### Recomendaciones de producción

1. **Hash de tokens**: En producción, usa bcrypt para hashear los tokens de API
    - Almacenar solo el hash en la base de datos
    - Usar `bcrypt.compare()` para validar

2. **HTTPS obligatorio**: Todos los endpoints deben usar HTTPS

3. **Rate limiting**: Implementa límites de tasa para prevenir abuso

4. **Rotación de tokens**: Cambia los tokens de API regularmente

5. **Auditoría**: Registra todos los accesos y errores

6. **Validaciones adicionales**:
    - Verificar la procedencia de las peticiones (IP del ESP32)
    - Implementar timestamps y nonces para prevenir replay attacks

### Variables de entorno

- `DATABASE_URL`: Nunca debe ser expuesta al cliente
- `IOT_API_DEBUG`: Debe ser `false` en producción

### Documentación de seguridad

- `SECURITY-AUDIT.md`: Auditoría completa de seguridad realizada
- `SECURITY-TESTS.md`: Suite de pruebas de seguridad con ejemplos de cURL

## Despliegue en Vercel

### Desde el repositorio

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Haz deploy automático en cada push

### Desde la CLI

```bash
vercel --prod
```

## Próximas mejoras

- [ ] Implementar hash de tokens con bcrypt
- [ ] Añadir rate limiting
- [ ] Implementar autenticación JWT para el dashboard
- [ ] Añadir websockets para tiempo real
- [ ] Crear dashboard web para visualización de datos
- [ ] Implementar alertas y notificaciones
- [ ] Añadir análisis y métricas
- [ ] Implementar rollback de datos
- [ ] Añadir backup automático
- [ ] Implementar multi-tenant para múltiples usuarios

## Troubleshooting

### Error 401 Unauthorized

- Verifica que el `node_code` existe en la base de datos
- Verifica que el `token` coincide con el almacenado
- Verifica que el nodo está marcado como `active = true`

### Error 400 Bad Request

- Revisa el formato del JSON
- Verifica que los campos obligatorios están presentes
- Verifica que los rangos de los valores son correctos

### Error 500 Internal Server Error

- Verifica que `DATABASE_URL` está configurada correctamente
- Revisa los logs de Vercel para más detalles
- Verifica que las tablas existen en la base de datos
