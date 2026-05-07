import Link from 'next/link';
import { sql } from '@/lib/db';
import './nodes.css';

export const dynamic = 'force-dynamic';

type NodeOverview = {
  id: string;
  node_code: string;
  name: string;
  location_name: string;
  crop: string;
  active: boolean;
  measured_at: string | null;
  air_temp_c: number | string | null;
  air_humidity_pct: number | string | null;
  soil_moisture_pct: number | string | null;
  battery_v: number | string | null;
  rssi_dbm: number | string | null;
};

const toNumber = (value: number | string | null) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatMetric = (value: number | null, suffix: string, digits = 1) => {
  if (value === null) return '--';
  return `${value.toFixed(digits)}${suffix}`;
};

const batteryPercent = (batteryV: number | null) => {
  if (batteryV === null) return null;
  return Math.max(0, Math.min(100, ((batteryV - 2.8) / (4.3 - 2.8)) * 100));
};

const minutesSince = (value: string | null) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
};

const formatLastReport = (minutes: number | null) => {
  if (minutes === null) return 'Sin reportes';
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `Hace ${hours}h`;
};

const signalStatus = (rssi: number | null) => {
  if (rssi === null) return 'Sin senal';
  if (rssi <= -85) return 'Debil';
  if (rssi <= -70) return 'Regular';
  return 'Estable';
};

const nodeStatus = (node: NodeOverview) => {
  const lastSeen = minutesSince(node.measured_at);
  const battery = batteryPercent(toNumber(node.battery_v));
  const moisture = toNumber(node.soil_moisture_pct);

  if (!node.active || lastSeen === null || lastSeen > 120) return 'offline';
  if ((battery !== null && battery < 20) || (moisture !== null && moisture < 20)) return 'critical';
  return 'stable';
};

export default async function NodesPage() {
  const rows = await sql`
    SELECT
      n.id,
      n.node_code,
      n.name,
      n.location_name,
      n.crop,
      n.active,
      latest.measured_at,
      latest.air_temp_c,
      latest.air_humidity_pct,
      latest.soil_moisture_pct,
      latest.battery_v,
      latest.rssi_dbm
    FROM nodes n
    LEFT JOIN LATERAL (
      SELECT
        sr.measured_at,
        sr.air_temp_c,
        sr.air_humidity_pct,
        sr.soil_moisture_pct,
        sr.battery_v,
        sr.rssi_dbm
      FROM sensor_readings sr
      WHERE sr.node_id = n.id
      ORDER BY sr.measured_at DESC
      LIMIT 1
    ) latest ON true
    ORDER BY n.active DESC, n.node_code ASC
  `;

  const nodes = rows as NodeOverview[];
  const activeNodes = nodes.filter((node) => node.active).length;
  const reportedNodes = nodes.filter((node) => node.measured_at).length;
  const criticalNodes = nodes.filter((node) => nodeStatus(node) === 'critical').length;
  const operability = nodes.length ? Math.round((activeNodes / nodes.length) * 100) : 0;
  const latestReport = nodes
    .map((node) => minutesSince(node.measured_at))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)[0] ?? null;

  return (
    <div className="nodes-shell">
      <header className="nodes-header">
        <Link className="nodes-brand" href="/">
          <span className="brand-icon">DT</span>
          <span>Data Tec Rural</span>
        </Link>
        <div className="nodes-actions">
          <button className="add-node-button" type="button">
            <span>+</span>
            <strong>Agregar Nuevo Nodo</strong>
          </button>
          <div className="user-avatar" aria-label="Usuario tecnico" />
        </div>
      </header>

      <main className="nodes-main">
        <section className="summary-grid" aria-label="Resumen del ecosistema">
          <article className="summary-card summary-wide">
            <div>
              <p>Estado del Ecosistema</p>
              <h1>{activeNodes} Nodos Activos</h1>
            </div>
            <div className="summary-tags">
              <span>{operability}% Operatividad</span>
              <span>{reportedNodes} con telemetria</span>
            </div>
          </article>

          <article className="summary-card">
            <div className="summary-line">
              <p>Alertas Recientes</p>
              <span className="warning-icon">!</span>
            </div>
            <h2>{criticalNodes.toString().padStart(2, '0')}</h2>
            <strong className="error-text">Requiere atencion inmediata</strong>
          </article>

          <article className="summary-card report-card">
            <div className="summary-line">
              <p>Ultimo Reporte</p>
              <span>sync</span>
            </div>
            <h2>{formatLastReport(latestReport)}</h2>
            <strong>Sincronizacion ESP32 Mesh</strong>
          </article>
        </section>

        <section className="nodes-titlebar">
          <div>
            <h2>Monitoreo de Nodos ESP32</h2>
            <p>Visualizacion en tiempo real de telemetria IoT</p>
          </div>
          <div className="view-actions">
            <button type="button">Filtro</button>
            <button type="button">Grid</button>
          </div>
        </section>

        <section className="node-grid" aria-label="Nodos ESP32">
          {nodes.map((node) => {
            const status = nodeStatus(node);
            const moisture = toNumber(node.soil_moisture_pct);
            const humidity = toNumber(node.air_humidity_pct);
            const temperature = toNumber(node.air_temp_c);
            const battery = batteryPercent(toNumber(node.battery_v));
            const signal = signalStatus(toNumber(node.rssi_dbm));

            return (
            <article className="node-card" key={node.id}>
              <div className="node-card-header">
                <div>
                  <span className={`status-dot ${status}`} />
                  <h3>{node.name || node.node_code}</h3>
                </div>
                <button type="button" aria-label={`Opciones de ${node.name}`}>...</button>
              </div>
              <div className="node-card-body">
                <div className="node-meta">
                  <span>{node.node_code}</span>
                  <span>{node.location_name || node.crop || 'Sin ubicacion'}</span>
                </div>
                <div className="metric-row">
                  <div>
                    <p>Suelo</p>
                    <strong className={status === 'critical' ? 'danger-value' : undefined}>{formatMetric(moisture, '%')}</strong>
                  </div>
                  <div>
                    <p>Temp.</p>
                    <strong>{formatMetric(temperature, 'ºC')}</strong>
                  </div>
                  <div>
                    <p>Humedad</p>
                    <strong>{formatMetric(humidity, '%')}</strong>
                  </div>
                </div>
                <div className="progress-track">
                  <span className={status === 'critical' ? 'danger-progress' : undefined} style={{ width: `${Math.max(0, Math.min(100, moisture ?? 0))}%` }} />
                </div>
                <div className={`node-footer ${status === 'critical' ? 'danger-footer' : ''}`}>
                  <span>Bateria: {battery === null ? '--' : `${battery.toFixed(0)}%`}</span>
                  <span>{status === 'offline' ? 'Offline' : signal}</span>
                </div>
                <small className="last-seen">Ultimo reporte: {formatLastReport(minutesSince(node.measured_at))}</small>
              </div>
            </article>
            );
          })}

          <button className="add-device-card" type="button">
            <span>+</span>
            <strong>Configurar Nuevo Dispositivo</strong>
            <small>Escanear codigo QR del ESP32</small>
          </button>
        </section>

        <section className="mesh-map">
          <div>
            <h2>Mapa de Red Mesh</h2>
            <p>
              {reportedNodes} de {nodes.length} nodos cuentan con telemetria reciente registrada. Revise los nodos criticos u offline antes de tomar decisiones de riego.
            </p>
          </div>
        </section>
      </main>

      <nav className="nodes-bottom-nav" aria-label="Navegacion movil">
        <Link href="/">Endpoints</Link>
        <a className="active" href="#top">Nodes</a>
        <Link href="/analytics">Analytics</Link>
        <a href="#top">Profile</a>
      </nav>
    </div>
  );
}
