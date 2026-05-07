import Link from 'next/link';
import { sql } from '@/lib/db';
import './analytics.css';

export const dynamic = 'force-dynamic';

type ReadingRow = {
  node_id: string;
  node_code: string;
  node_name: string;
  location_name: string | null;
  crop: string | null;
  measured_at: string;
  air_temp_c: number | string | null;
  air_humidity_pct: number | string | null;
  soil_moisture_pct: number | string | null;
  battery_v: number | string | null;
};

type StationSummary = {
  nodeId: string;
  name: string;
  humidity: string;
  growth: string;
  status: string;
  tone: 'good' | 'watch';
};

const toNumber = (value: number | string | null) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const average = (values: Array<number | null>) => {
  const valid = values.filter((value): value is number => value !== null);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const formatPercent = (value: number | null) => (value === null ? '--' : `${value.toFixed(1)}%`);

const estimateGrowth = (soilMoisture: number | null, airTemp: number | null) => {
  if (soilMoisture === null && airTemp === null) return null;
  const moistureScore = Math.max(0, Math.min(1, ((soilMoisture ?? 45) - 15) / 65));
  const tempScore = airTemp === null ? 0.7 : Math.max(0, Math.min(1, 1 - Math.abs(airTemp - 24) / 18));
  return 1.2 + moistureScore * 3.4 + tempScore * 1.2;
};

const weekKey = (date: Date) => {
  const day = date.getDate();
  if (day <= 7) return 0;
  if (day <= 14) return 1;
  if (day <= 21) return 2;
  return 3;
};

const buildPath = (values: Array<number | null>, minY: number, maxY: number) => {
  const valid = values.map((value, index) => ({ value, index })).filter((point): point is { value: number; index: number } => point.value !== null);
  if (!valid.length) return '';
  const x = (index: number) => (values.length <= 1 ? 400 : (index / (values.length - 1)) * 800);
  const y = (value: number) => 280 - ((value - minY) / (maxY - minY || 1)) * 220;
  return valid.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
};

const buildArea = (path: string) => (path ? `${path} L800,300 L0,300 Z` : '');

export default async function AnalyticsPage() {
  const rows = await sql`
    SELECT
      sr.node_id,
      n.node_code,
      n.name AS node_name,
      n.location_name,
      n.crop,
      sr.measured_at,
      sr.air_temp_c,
      sr.air_humidity_pct,
      sr.soil_moisture_pct,
      sr.battery_v
    FROM sensor_readings sr
    JOIN nodes n ON sr.node_id = n.id
    WHERE sr.measured_at >= NOW() - INTERVAL '30 days'
    ORDER BY sr.measured_at ASC
  `;

  const readings = rows as ReadingRow[];
  const weekly = [0, 1, 2, 3].map((week) => {
    const bucket = readings.filter((reading) => weekKey(new Date(reading.measured_at)) === week);
    const moisture = average(bucket.map((reading) => toNumber(reading.soil_moisture_pct)));
    const temp = average(bucket.map((reading) => toNumber(reading.air_temp_c)));
    return {
      moisture,
      growth: estimateGrowth(moisture, temp),
    };
  });

  const moistureValues = weekly.map((week) => week.moisture);
  const growthValues = weekly.map((week) => week.growth === null ? null : week.growth * 16);
  const humidityPath = buildPath(moistureValues, 0, 100);
  const growthPath = buildPath(growthValues, 0, 100);
  const avgSoilMoisture = average(readings.map((reading) => toNumber(reading.soil_moisture_pct)));
  const avgAirTemp = average(readings.map((reading) => toNumber(reading.air_temp_c)));
  const avgGrowth = estimateGrowth(avgSoilMoisture, avgAirTemp);
  const soilHealth = avgSoilMoisture === null ? null : Math.max(0, Math.min(100, avgSoilMoisture * 1.08));
  const waterDeficit = avgSoilMoisture === null ? null : Math.max(0, (55 - avgSoilMoisture) / 8);
  const stationMap = new Map<string, ReadingRow[]>();

  readings.forEach((reading) => {
    const current = stationMap.get(reading.node_id) || [];
    current.push(reading);
    stationMap.set(reading.node_id, current);
  });

  const stations: StationSummary[] = Array.from(stationMap.entries()).map(([nodeId, stationReadings]) => {
    const first = stationReadings[0];
    const avgHumidity = average(stationReadings.map((reading) => toNumber(reading.soil_moisture_pct)));
    const avgTemp = average(stationReadings.map((reading) => toNumber(reading.air_temp_c)));
    const growth = estimateGrowth(avgHumidity, avgTemp);
    const watch = avgHumidity === null || avgHumidity < 35 || avgHumidity > 85;

    return {
      nodeId,
      name: first.location_name || first.node_name || first.node_code,
      humidity: formatPercent(avgHumidity),
      growth: growth === null ? '--' : `${growth.toFixed(1)} cm`,
      status: watch ? 'Observacion' : 'Optimo',
      tone: watch ? 'watch' : 'good',
    };
  });

  return (
    <div className="analytics-shell">
      <header className="analytics-header">
        <Link className="analytics-brand" href="/">
          <span className="analytics-brand-mark">DT</span>
          <span>Data Tec Rural</span>
        </Link>
        <nav className="analytics-nav" aria-label="Principal">
          <Link href="/">Endpoints</Link>
          <Link href="/nodes">Nodes</Link>
          <a className="active" href="#top">Analytics</a>
          <a href="#top">Profile</a>
        </nav>
        <div className="analytics-avatar" aria-label="Usuario" />
      </header>

      <main className="analytics-main">
        <section className="analytics-titlebar">
          <div>
            <h1>Analisis de Tendencias</h1>
            <p>
              Visualice el rendimiento historico y la correlacion entre variables criticas para la toma de decisiones basada en datos IoT.
            </p>
          </div>
          <div className="analytics-controls">
            <div className="range-switch" aria-label="Rango de analisis">
              <button type="button">Dia</button>
              <button type="button">Semana</button>
              <button className="active" type="button">Mes</button>
            </div>
            <button className="export-button" type="button">Exportar</button>
          </div>
        </section>

        <section className="analytics-grid">
          <article className="chart-card main-chart-card">
            <div className="chart-header">
              <h2>Comparativa: Humedad vs Crecimiento</h2>
              <div className="chart-legend">
                <span><i className="humidity-dot" />Humedad (%)</span>
                <span><i className="growth-dot" />Crecimiento (Est.)</span>
              </div>
            </div>
            <div className="trend-chart" aria-label="Grafica de humedad contra crecimiento">
              <div className="grid-lines" />
              {!readings.length && <div className="chart-empty">Sin lecturas en los ultimos 30 dias</div>}
              <svg viewBox="0 0 800 300" preserveAspectRatio="none" role="img">
                <defs>
                  <linearGradient id="growthFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#95d4b3" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#95d4b3" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={buildArea(growthPath)} fill="url(#growthFill)" />
                <path d={growthPath} className="growth-line" />
                <path d={humidityPath} className="humidity-line" />
              </svg>
              <div className="x-axis"><span>Sem 1</span><span>Sem 2</span><span>Sem 3</span><span>Sem 4</span></div>
            </div>
          </article>

          <aside className="insights-column">
            <article className="ai-card">
              <div className="ai-title"><span>*</span><h2>IA Insights</h2></div>
              <p>La humedad promedio del suelo es {formatPercent(avgSoilMoisture)} durante los ultimos 30 dias, con crecimiento estimado de {avgGrowth === null ? '--' : `${avgGrowth.toFixed(1)} cm`}.</p>
              <p>{waterDeficit !== null && waterDeficit > 0 ? `Se estima un deficit hidrico de ${waterDeficit.toFixed(1)}mm; priorice revision de riego en estaciones bajo 35%.` : 'Las lecturas no muestran deficit hidrico relevante en el periodo analizado.'}</p>
            </article>
            <div className="mini-metrics">
              <article>
                <p>Salud Suelo</p>
                <strong>{soilHealth === null ? '--' : `${soilHealth.toFixed(0)}%`}</strong>
                <span className="positive">Prom. 30 dias</span>
              </article>
              <article>
                <p>Deficit Hidrico</p>
                <strong>{waterDeficit === null ? '--' : `${waterDeficit.toFixed(1)}mm`}</strong>
                <span className={waterDeficit !== null && waterDeficit > 0 ? 'negative' : 'positive'}>Estimado</span>
              </article>
            </div>
          </aside>

          <article className="records-card">
            <div className="records-header"><h2>Registros de Estacion Rural</h2></div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Estacion</th>
                    <th>Humedad Media</th>
                    <th>Crecimiento Sem.</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((station) => (
                    <tr key={station.name}>
                      <td>{station.name}</td>
                      <td>{station.humidity}</td>
                      <td>{station.growth}</td>
                      <td><span className={`status-badge ${station.tone}`}>{station.status}</span></td>
                      <td><button type="button">Ver detalles</button></td>
                    </tr>
                  ))}
                  {!stations.length && (
                    <tr>
                      <td colSpan={5}>No hay registros de estaciones para el periodo seleccionado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </main>

      <nav className="analytics-bottom-nav" aria-label="Navegacion movil">
        <Link href="/">Endpoints</Link>
        <Link href="/nodes">Nodes</Link>
        <a className="active" href="#top">Analytics</a>
        <a href="#top">Profile</a>
      </nav>
    </div>
  );
}
