export type Reading = {
  id: number;
  node_id: string;
  node_code: string;
  measured_at: string;
  created_at: string;
  air_temp_c: number | null;
  air_humidity_pct: number | null;
  pressure_hpa: number | null;
  leaf_temp_c: number | null;
  soil_moisture_raw: number | null;
  soil_moisture_pct: number | null;
  battery_v: number | null;
  rssi_dbm: number | null;
};

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type Alert = {
  code: string;
  severity: AlertSeverity;
  message: string;
  value?: number;
  threshold?: number;
};

export function minutesSince(dateValue: string | Date): number {
  const measuredAt = new Date(dateValue).getTime();
  return Math.max(0, Math.round((Date.now() - measuredAt) / 60000));
}

export function diagnoseReading(reading: Reading | null): Alert[] {
  if (!reading) {
    return [
      {
        code: 'no_readings',
        severity: 'critical',
        message: 'El nodo no tiene lecturas registradas.'
      }
    ];
  }

  const alerts: Alert[] = [];
  const minutesWithoutReport = minutesSince(reading.measured_at);

  if (minutesWithoutReport > 24 * 60) {
    alerts.push({
      code: 'node_offline',
      severity: 'critical',
      message: 'El nodo no ha reportado datos en mas de 24 horas.',
      value: minutesWithoutReport,
      threshold: 24 * 60
    });
  } else if (minutesWithoutReport > 6 * 60) {
    alerts.push({
      code: 'node_delayed',
      severity: 'warning',
      message: 'El nodo lleva mas de 6 horas sin reportar.',
      value: minutesWithoutReport,
      threshold: 6 * 60
    });
  }

  if (reading.battery_v !== null && reading.battery_v < 3.2) {
    alerts.push({
      code: 'battery_critical',
      severity: 'critical',
      message: 'La bateria del nodo esta en nivel critico.',
      value: reading.battery_v,
      threshold: 3.2
    });
  } else if (reading.battery_v !== null && reading.battery_v < 3.4) {
    alerts.push({
      code: 'battery_low',
      severity: 'warning',
      message: 'La bateria del nodo esta baja.',
      value: reading.battery_v,
      threshold: 3.4
    });
  }

  if (reading.rssi_dbm !== null && reading.rssi_dbm < -80) {
    alerts.push({
      code: 'weak_signal',
      severity: 'warning',
      message: 'La senal WiFi del nodo es debil.',
      value: reading.rssi_dbm,
      threshold: -80
    });
  }

  if (reading.soil_moisture_pct !== null && reading.soil_moisture_pct < 25) {
    alerts.push({
      code: 'soil_moisture_low',
      severity: 'warning',
      message: 'La humedad del suelo esta baja.',
      value: reading.soil_moisture_pct,
      threshold: 25
    });
  }

  if (reading.soil_moisture_pct !== null && reading.soil_moisture_pct > 80) {
    alerts.push({
      code: 'soil_moisture_high',
      severity: 'warning',
      message: 'La humedad del suelo esta alta.',
      value: reading.soil_moisture_pct,
      threshold: 80
    });
  }

  if (reading.leaf_temp_c !== null && reading.leaf_temp_c > 35) {
    alerts.push({
      code: 'leaf_temperature_high',
      severity: 'warning',
      message: 'La temperatura foliar esta alta.',
      value: reading.leaf_temp_c,
      threshold: 35
    });
  }

  if (reading.air_humidity_pct !== null && reading.air_humidity_pct < 35) {
    alerts.push({
      code: 'air_humidity_low',
      severity: 'info',
      message: 'La humedad ambiental esta baja.',
      value: reading.air_humidity_pct,
      threshold: 35
    });
  }

  return alerts;
}

export function summarizeReading(reading: Reading | null, alerts: Alert[]): string {
  if (!reading) {
    return 'No hay lecturas disponibles para generar un resumen agronomico.';
  }

  const alertSummary = alerts.length === 0
    ? 'No se detectan alertas con los umbrales actuales.'
    : `Alertas detectadas: ${alerts.map((alert) => alert.message).join(' ')}`;

  return [
    `Nodo ${reading.node_code}: ultima medicion ${reading.measured_at}.`,
    `Temperatura ambiente: ${reading.air_temp_c ?? 'sin dato'} C; humedad ambiental: ${reading.air_humidity_pct ?? 'sin dato'}%.`,
    `Humedad de suelo: ${reading.soil_moisture_pct ?? 'sin dato'}%; temperatura foliar: ${reading.leaf_temp_c ?? 'sin dato'} C.`,
    `Bateria: ${reading.battery_v ?? 'sin dato'} V; RSSI: ${reading.rssi_dbm ?? 'sin dato'} dBm.`,
    alertSummary
  ].join(' ');
}
