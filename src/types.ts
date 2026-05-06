export interface Node {
  id: string;
  node_code: string;
  name: string;
  location_name: string;
  crop: string;
  wifi_ssid: string;
  wifi_password: string;
  api_token: string;
  active: boolean;
  created_at: string;
}

export interface SensorReading {
  id: number;
  node_id: string;
  node_code: string;
  node_name: string;
  location_name: string;
  crop: string;
  wifi_ssid: string;
  measured_at: string;
  air_temp_c: number | null;
  air_humidity_pct: number | null;
  pressure_hpa: number | null;
  leaf_temp_c: number | null;
  soil_moisture_raw: number | null;
  soil_moisture_pct: number | null;
  battery_v: number | null;
  rssi_dbm: number | null;
  created_at: string;
}