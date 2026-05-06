create extension if not exists pgcrypto;

create table if not exists nodes (
  id uuid primary key default gen_random_uuid(),
  node_code text unique not null,
  name text,
  api_token text not null,
  location_name text,
  crop text,
  wifi_ssid text,
  wifi_password text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists sensor_readings (
  id bigserial primary key,
  node_id uuid not null references nodes(id) on delete cascade,
  measured_at timestamptz not null default now(),

  air_temp_c numeric(6,2),
  air_humidity_pct numeric(6,2),
  pressure_hpa numeric(7,2),
  leaf_temp_c numeric(6,2),
  soil_moisture_raw integer,
  soil_moisture_pct numeric(6,2),
  battery_v numeric(5,2),
  rssi_dbm integer,

  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sensor_readings_node_time
on sensor_readings (node_id, measured_at desc);

create index if not exists idx_nodes_node_code
on nodes (node_code);