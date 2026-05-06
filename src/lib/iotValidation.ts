import { z } from 'zod';

export const IoTReadingSchema = z.object({
  node_code: z.string()
    .min(1, 'node_code is required')
    .max(50, 'node_code too long')
    .regex(/^[A-Za-z0-9\-_]+$/, 'node_code contains invalid characters'),
  token: z.string()
    .min(1, 'token is required')
    .max(255, 'token too long'),
  air_temp_c: z.number()
    .min(-50, 'air_temp_c out of range')
    .max(60, 'air_temp_c out of range')
    .optional(),
  air_humidity_pct: z.number()
    .min(0, 'air_humidity_pct out of range')
    .max(100, 'air_humidity_pct out of range')
    .optional(),
  pressure_hpa: z.number()
    .min(800, 'pressure_hpa out of range')
    .max(1100, 'pressure_hpa out of range')
    .optional(),
  leaf_temp_c: z.number()
    .min(-20, 'leaf_temp_c out of range')
    .max(70, 'leaf_temp_c out of range')
    .optional(),
  soil_moisture_raw: z.number()
    .int('soil_moisture_raw must be integer')
    .min(0, 'soil_moisture_raw cannot be negative')
    .max(4095, 'soil_moisture_raw out of range')
    .optional(),
  soil_moisture_pct: z.number()
    .min(0, 'soil_moisture_pct out of range')
    .max(100, 'soil_moisture_pct out of range')
    .optional(),
  battery_v: z.number()
    .min(2.5, 'battery_v out of range')
    .max(6, 'battery_v out of range')
    .optional(),
  rssi_dbm: z.number()
    .int('rssi_dbm must be integer')
    .min(-120, 'rssi_dbm out of range')
    .max(0, 'rssi_dbm out of range')
    .optional(),
  measured_at: z.string()
    .datetime('Invalid measured_at format')
    .refine((val) => {
      const date = new Date(val);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneHourAhead = new Date(Date.now() + 60 * 60 * 1000);
      return date >= oneDayAgo && date <= oneHourAhead;
    }, 'measured_at out of valid range')
    .optional()
});

export type IoTReading = z.infer<typeof IoTReadingSchema>;
