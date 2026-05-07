'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Node, SensorReading } from '@/types';
import Icon from './Icons';
import './dashboard.css';

interface DashboardClientProps {
  nodes: Node[];
  readings: SensorReading[];
  filters: {
    node_code?: string;
    start_date?: string;
    end_date?: string;
  };
}

type MetricKey =
  | 'air_temp_c'
  | 'air_humidity_pct'
  | 'pressure_hpa'
  | 'leaf_temp_c'
  | 'soil_moisture_pct'
  | 'battery_v'
  | 'rssi_dbm';

type ChartPoint = {
  x: number;
  y: number;
  value: number;
  measuredAt?: string;
};

const metrics = [
  { key: 'air_temp_c', label: 'TEMP. AIRE', icon: 'thermostat', unit: '°C', colorClass: 'primary', digits: 1, minSpan: 4 },
  { key: 'air_humidity_pct', label: 'HUMEDAD AIRE', icon: 'humidity_percentage', unit: '%', colorClass: 'tertiary', digits: 1, minSpan: 10, hardMin: 0, hardMax: 100 },
  { key: 'pressure_hpa', label: 'PRESIÓN ATM.', icon: 'barometer', unit: 'hPa', colorClass: 'neutral', digits: 1, minSpan: 20 },
  { key: 'leaf_temp_c', label: 'TEMPERATURA FOLIAR', icon: 'eco', unit: '°C', colorClass: 'primary', digits: 1, minSpan: 4 },
  { key: 'soil_moisture_pct', label: 'HUMEDAD DEL SUELO', icon: 'grass', unit: '%', colorClass: 'tertiary', digits: 1, minSpan: 15, hardMin: 0, hardMax: 100 },
  { key: 'battery_v', label: 'VOLTAJE DE BATERÍA', icon: 'battery_std', unit: 'V', colorClass: 'primary', digits: 2, minSpan: 0.8 },
  { key: 'rssi_dbm', label: 'SEÑAL WIFI', icon: 'wifi', unit: 'dBm', colorClass: 'tertiary', digits: 0, minSpan: 20 },
] as const;

const formatNumber = (value: number | null | undefined, digits = 1) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return value.toFixed(digits);
};

const average = (values: Array<number | null>) => {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const percentage = (value: number | null | undefined, min: number, max: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Sin datos';
  return new Date(value).toLocaleString();
};

const formatChartTick = (value?: string) => {
  if (!value) return '--';
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const trendDelta = (readings: SensorReading[], key: MetricKey) => {
  const values = readings
    .filter((reading) => typeof reading[key] === 'number')
    .slice(0, 2)
    .map((reading) => reading[key] as number);

  if (values.length < 2) return null;
  return values[0] - values[1];
};

const buildYAxisDomain = (
  minValue: number,
  maxValue: number,
  metric: (typeof metrics)[number],
) => {
  const rawSpan = maxValue - minValue;
  const span = Math.max(rawSpan * 1.4, metric.minSpan);
  const center = (minValue + maxValue) / 2;
  let domainMin = center - span / 2;
  let domainMax = center + span / 2;

  if ('hardMin' in metric && typeof metric.hardMin === 'number' && domainMin < metric.hardMin) {
    domainMax += metric.hardMin - domainMin;
    domainMin = metric.hardMin;
  }

  if ('hardMax' in metric && typeof metric.hardMax === 'number' && domainMax > metric.hardMax) {
    domainMin -= domainMax - metric.hardMax;
    domainMax = metric.hardMax;
  }

  return { domainMin, domainMax };
};

export default function DashboardClient({ nodes, readings, filters }: DashboardClientProps) {
  const router = useRouter();
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('air_temp_c');
  const [search, setSearch] = useState('');
  const [hoverPoint, setHoverPoint] = useState<ChartPoint | null>(null);
  const [filterValues, setFilterValues] = useState({
    node_code: filters.node_code || '',
    start_date: filters.start_date || '',
    end_date: filters.end_date || '',
  });

  const latest = readings[0];
  const latestNode = latest ? nodes.find((node) => node.node_code === latest.node_code) : nodes[0];
  const selectedMetricConfig = metrics.find((metric) => metric.key === selectedMetric) || metrics[0];
  const batteryPercent = percentage(latest?.battery_v, 2.8, 4.3);
  const soilPercent = percentage(latest?.soil_moisture_pct, 0, 100);
  const rssiPercent = percentage(latest?.rssi_dbm, -100, -35);

  const filteredTableRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return readings;

    return readings.filter((reading) =>
      [
        reading.node_code,
        reading.location_name,
        reading.crop,
        reading.node_name,
        formatDateTime(reading.measured_at),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [readings, search]);

  const chartReadings = useMemo(
    () =>
      [...readings]
        .filter((reading) => typeof reading[selectedMetric] === 'number')
        .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()),
    [readings, selectedMetric],
  );

  const chartData = useMemo(() => {
    const values = chartReadings.map((reading) => reading[selectedMetric] as number);
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 1;
    const { domainMin, domainMax } = buildYAxisDomain(minValue, maxValue, selectedMetricConfig);
    const yRange = domainMax - domainMin || 1;
    const pointList = chartReadings.map((reading, index) => {
      const x = chartReadings.length <= 1 ? 50 : 4 + (index / (chartReadings.length - 1)) * 92;
      const value = reading[selectedMetric] as number;
      const y = 88 - ((value - domainMin) / yRange) * 76;
      return { x, y, value, measuredAt: reading.measured_at };
    });
    const points = pointList.map((point) => `${point.x},${point.y}`).join(' ');
    const latestPoint = pointList[pointList.length - 1] || null;
    const midReading = chartReadings[Math.floor((chartReadings.length - 1) / 2)];
    const xTicks = chartReadings.length
      ? [chartReadings[0], midReading, chartReadings[chartReadings.length - 1]].map((reading) => formatChartTick(reading?.measured_at))
      : ['--', '--', '--'];

    return {
      points,
      area: pointList.length > 1 ? `4,94 ${points} 96,94` : '',
      pointList,
      latestPoint,
      xTicks,
      minValue,
      maxValue,
      domainMin,
      domainMax,
      midValue: domainMin + yRange / 2,
      count: values.length,
    };
  }, [chartReadings, selectedMetric, selectedMetricConfig]);

  const recentBars = (key: MetricKey, min: number, max: number) =>
    [...readings]
      .slice(0, 8)
      .reverse()
      .map((reading) => percentage(reading[key], min, max));

  const handleFilterSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (filterValues.node_code) params.set('node_code', filterValues.node_code);
    if (filterValues.start_date) params.set('start_date', filterValues.start_date);
    if (filterValues.end_date) params.set('end_date', filterValues.end_date);
    router.push(`/dashboard?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilterValues({ node_code: '', start_date: '', end_date: '' });
    router.push('/dashboard');
  };

  const handleChartHover = (event: React.MouseEvent<HTMLDivElement>) => {
    if (chartData.pointList.length === 0) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const nearest = chartData.pointList.reduce((closest, point) =>
      Math.abs(point.x - x) < Math.abs(closest.x - x) ? point : closest,
    );

    setHoverPoint(nearest);
  };

  const exportCsv = () => {
    const headers = [
      'id',
      'node_code',
      'measured_at',
      'air_temp_c',
      'air_humidity_pct',
      'pressure_hpa',
      'leaf_temp_c',
      'soil_moisture_raw',
      'soil_moisture_pct',
      'battery_v',
      'rssi_dbm',
      'created_at',
    ];
    const csvRows = [
      headers.join(','),
      ...readings.map((reading) =>
        headers
          .map((header) => `"${String(reading[header as keyof SensorReading] ?? '').replaceAll('"', '""')}"`)
          .join(','),
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data-tecrural-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="agro-app">
      <aside className="agro-sidebar">
        <div className="sidebar-brand">
          <h1>AgroMonitor Pro</h1>
          <div className="station-card">
            <div className="station-avatar">TR</div>
            <div>
              <p>{latestNode?.name || 'Estación TecRural'}</p>
              <span>ID: {latest?.node_code || latestNode?.node_code || 'SIN-NODO'}</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación">
          <a className="active" href="#dashboard"><Icon name="dashboard" />Dashboard</a>
          <a href="#sensores"><Icon name="sensors" />Sensores</a>
          <a href="#analisis"><Icon name="trending_up" />Análisis</a>
          <a href="#datos"><Icon name="description" />Datos</a>
        </nav>

        <button className="export-button" type="button" onClick={exportCsv}>Exportar Datos</button>
      </aside>

      <main className="agro-main" id="dashboard">
        <header className="agro-topbar">
          <div className="search-box">
            <Icon name="search" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar sensor, nodo o cultivo..."
              type="text"
            />
          </div>
          <div className="topbar-actions">
            <span className="status-pill">Sistema online</span>
            <button type="button"><Icon name="notifications" /></button>
            <button type="button"><Icon name="settings" /></button>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="dashboard-heading">
            <div>
              <h2>Dashboard General</h2>
              <p>Monitoreo en tiempo real - Última actualización: {formatDateTime(latest?.measured_at)}</p>
            </div>
            <form className="filter-bar" onSubmit={handleFilterSubmit}>
              <select
                value={filterValues.node_code}
                onChange={(event) => setFilterValues((prev) => ({ ...prev, node_code: event.target.value }))}
                aria-label="Nodo"
              >
                <option value="">Todos los nodos</option>
                {nodes.map((node) => (
                  <option key={node.id} value={node.node_code}>{node.node_code} - {node.name}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={filterValues.start_date}
                onChange={(event) => setFilterValues((prev) => ({ ...prev, start_date: event.target.value }))}
                aria-label="Fecha inicio"
              />
              <input
                type="datetime-local"
                value={filterValues.end_date}
                onChange={(event) => setFilterValues((prev) => ({ ...prev, end_date: event.target.value }))}
                aria-label="Fecha fin"
              />
              <button type="submit">Filtrar</button>
              <button type="button" onClick={clearFilters}>Limpiar</button>
            </form>
          </div>

          <section className="bento-grid">
            <div className="section-label atmospheric">Sección Atmosférica</div>

            <article className="metric-card span-4">
              <div className="metric-head">
                <div>
                  <p>TEMP. AIRE</p>
                  <strong className="display-data primary-text">{formatNumber(latest?.air_temp_c)}<span>°C</span></strong>
                </div>
                <Icon name="thermostat" className="icon-chip primary-chip" />
              </div>
              <div className="spark-bars">
                {recentBars('air_temp_c', 10, 40).map((height, index) => <i key={index} style={{ height: `${Math.max(height, 8)}%` }} />)}
              </div>
              <span className="spark-label">Tendencia reciente</span>
            </article>

            <article className="metric-card span-4">
              <div className="metric-head">
                <div>
                  <p>HUMEDAD AIRE</p>
                  <strong className="display-data tertiary-text">{formatNumber(latest?.air_humidity_pct)}<span>%</span></strong>
                </div>
                <Icon name="humidity_percentage" className="icon-chip tertiary-chip" />
              </div>
              <div className="spark-bars tertiary-bars">
                {recentBars('air_humidity_pct', 0, 100).map((height, index) => <i key={index} style={{ height: `${Math.max(height, 8)}%` }} />)}
              </div>
              <span className="spark-label">Tendencia reciente</span>
            </article>

            <article className="metric-card span-4">
              <div className="metric-head">
                <div>
                  <p>PRESIÓN ATM.</p>
                  <strong className="display-data neutral-text">{formatNumber(latest?.pressure_hpa, 1)}<span> hPa</span></strong>
                </div>
                <Icon name="barometer" className="icon-chip neutral-chip" />
              </div>
              <div className="spark-bars neutral-bars">
                {recentBars('pressure_hpa', 800, 1100).map((height, index) => <i key={index} style={{ height: `${Math.max(height, 8)}%` }} />)}
              </div>
              <span className="spark-label">Tendencia reciente</span>
            </article>

            <div className="section-label plant">Sección Planta/Suelo</div>

            <article className="metric-card span-6 feature-card primary-edge">
              <div className="metric-head">
                <div>
                  <div className="label-with-icon"><Icon name="eco" /><p>TEMPERATURA FOLIAR</p></div>
                  <strong className="display-data">{formatNumber(latest?.leaf_temp_c)}<span>°C</span></strong>
                </div>
                <div className="trend-box">
                  <span className={trendDelta(readings, 'leaf_temp_c') && trendDelta(readings, 'leaf_temp_c')! < 0 ? 'down' : 'up'}>
                    {formatNumber(trendDelta(readings, 'leaf_temp_c'))} °C
                  </span>
                  <small>Última variación</small>
                </div>
              </div>
              <div className="range-card">
                <div className="range-track"><i style={{ width: `${percentage(latest?.leaf_temp_c, 10, 40)}%` }} /></div>
                <div className="range-labels"><span>Óptimo: 18-24°C</span><span>Crítico: &gt;30°C</span></div>
              </div>
            </article>

            <article className="metric-card span-6 feature-card tertiary-edge">
              <div className="metric-head">
                <div>
                  <div className="label-with-icon"><Icon name="grass" /><p>HUMEDAD DEL SUELO</p></div>
                  <strong className="display-data">{formatNumber(latest?.soil_moisture_pct)}<span>%</span></strong>
                </div>
                <div className="trend-box">
                  <span className={soilPercent < 40 ? 'down' : 'up'}>{soilPercent < 40 ? 'Revisar' : 'Estable'}</span>
                  <small>Estado hídrico</small>
                </div>
              </div>
              <div className="range-card">
                <div className="range-track tertiary-track"><i style={{ width: `${soilPercent}%` }} /></div>
                <div className="range-labels"><span>Marchitez: 15%</span><span>Cap. campo: 40%</span></div>
              </div>
            </article>

            <div className="section-label energy">Sección de Energía y Señal</div>

            <article className="metric-card span-8 energy-card">
              <div className="battery-ring">
                <svg viewBox="0 0 36 36">
                  <circle className="ring-bg" cx="18" cy="18" fill="none" r="16" strokeWidth="3" />
                  <circle className="ring-fg" cx="18" cy="18" fill="none" r="16" strokeDasharray="100" strokeDashoffset={100 - batteryPercent} strokeWidth="3" />
                </svg>
                <div>
                  <Icon name="battery_std" />
                  <strong>{batteryPercent.toFixed(0)}%</strong>
                </div>
              </div>
              <div className="energy-detail">
                <div><p>VOLTAJE DE BATERÍA</p><strong>{formatNumber(latest?.battery_v, 2)} V</strong></div>
                <div className="mini-grid">
                  <span><small>AUTONOMÍA EST.</small><b>{batteryPercent > 60 ? 'Alta' : batteryPercent > 30 ? 'Media' : 'Baja'}</b></span>
                  <span><small>SEÑAL WIFI</small><b>{formatNumber(latest?.rssi_dbm, 0)} dBm</b></span>
                </div>
              </div>
            </article>

            <article className="status-card span-4">
              <p>ESTADO DEL DISPOSITIVO</p>
              <h4>{readings.length > 0 ? 'Sistema recibiendo datos' : 'Sin lecturas detectadas'}</h4>
              <span>Calidad señal estimada: {rssiPercent.toFixed(0)}%</span>
            </article>

            <article className={`chart-card span-12 ${selectedMetricConfig.colorClass}-chart`} id="analisis">
              <div className="chart-heading">
                <div>
                  <p>ANÁLISIS TEMPORAL</p>
                  <h3>{selectedMetricConfig.label}</h3>
                </div>
                <div className="chart-controls">
                  <span className="chart-current">
                    Último: {chartData.latestPoint ? formatNumber(chartData.latestPoint.value, selectedMetricConfig.digits) : '--'} {selectedMetricConfig.unit}
                  </span>
                  <select value={selectedMetric} onChange={(event) => setSelectedMetric(event.target.value as MetricKey)}>
                    {metrics.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="chart-layout">
                <div className="y-axis">
                  <span>{chartData.count > 0 ? chartData.domainMax.toFixed(selectedMetricConfig.digits) : '--'} {selectedMetricConfig.unit}</span>
                  <span>{chartData.count > 0 ? chartData.midValue.toFixed(selectedMetricConfig.digits) : '--'} {selectedMetricConfig.unit}</span>
                  <span>{chartData.count > 0 ? chartData.domainMin.toFixed(selectedMetricConfig.digits) : '--'} {selectedMetricConfig.unit}</span>
                </div>
                <div className="chart-plot">
                  <div className="line-chart-frame" onMouseLeave={() => setHoverPoint(null)} onMouseMove={handleChartHover}>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Gráfico temporal">
                      {chartData.count > 1 && <polygon className="chart-area" points={chartData.area} />}
                      {chartData.count > 1 && <polyline className="chart-line" points={chartData.points} />}
                    </svg>
                    {hoverPoint && (
                      <>
                        <span className="chart-hover-line" style={{ left: `${hoverPoint.x}%` }} />
                        <span className="chart-hover-dot" style={{ left: `${hoverPoint.x}%`, top: `${hoverPoint.y}%` }} />
                        <span className="chart-tooltip" style={{ left: `${hoverPoint.x}%`, top: `${hoverPoint.y}%` }}>
                          <b>{formatNumber(hoverPoint.value, selectedMetricConfig.digits)} {selectedMetricConfig.unit}</b>
                          <small>{formatDateTime(hoverPoint.measuredAt)}</small>
                        </span>
                      </>
                    )}
                    {chartData.latestPoint && (
                      <span
                        className="chart-last-dot"
                        style={{ left: `${chartData.latestPoint.x}%`, top: `${chartData.latestPoint.y}%` }}
                      />
                    )}
                    {chartData.count === 0 && <span className="chart-empty">Sin datos para graficar</span>}
                  </div>
                  <div className="x-axis" aria-hidden="true">
                    {chartData.xTicks.map((tick, index) => <span key={`${tick}-${index}`}>{tick}</span>)}
                  </div>
                </div>
              </div>
              <div className="chart-meta">
                <span>Mín. real {chartData.count > 0 ? chartData.minValue.toFixed(selectedMetricConfig.digits) : '--'} {selectedMetricConfig.unit}</span>
                <span>Máx. real {chartData.count > 0 ? chartData.maxValue.toFixed(selectedMetricConfig.digits) : '--'} {selectedMetricConfig.unit}</span>
                <span>Escala Y ajustada para evitar sobreamplificación</span>
              </div>
            </article>
          </section>

          <section className="data-panel" id="datos">
            <div className="data-heading">
              <div>
                <h3>Todos los datos guardados</h3>
                <p>{filteredTableRows.length} de {readings.length} lecturas visibles</p>
              </div>
              <button type="button" onClick={exportCsv}>Exportar CSV</button>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nodo</th>
                    <th>Ubicación</th>
                    <th>Cultivo</th>
                    <th>Medición</th>
                    <th>Temp. aire</th>
                    <th>Humedad aire</th>
                    <th>Presión</th>
                    <th>Temp. hoja</th>
                    <th>Suelo raw</th>
                    <th>Suelo</th>
                    <th>Batería</th>
                    <th>RSSI</th>
                    <th>Guardado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableRows.map((reading) => (
                    <tr key={reading.id}>
                      <td>{reading.id}</td>
                      <td>{reading.node_code}</td>
                      <td>{reading.location_name || '--'}</td>
                      <td>{reading.crop || '--'}</td>
                      <td>{formatDateTime(reading.measured_at)}</td>
                      <td>{formatNumber(reading.air_temp_c)} °C</td>
                      <td>{formatNumber(reading.air_humidity_pct)} %</td>
                      <td>{formatNumber(reading.pressure_hpa, 2)} hPa</td>
                      <td>{formatNumber(reading.leaf_temp_c)} °C</td>
                      <td>{formatNumber(reading.soil_moisture_raw, 0)}</td>
                      <td>{formatNumber(reading.soil_moisture_pct)} %</td>
                      <td>{formatNumber(reading.battery_v, 2)} V</td>
                      <td>{formatNumber(reading.rssi_dbm, 0)} dBm</td>
                      <td>{formatDateTime(reading.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>

      <nav className="mobile-nav" aria-label="Navegación móvil">
        <a href="#dashboard"><Icon name="dashboard" />Dashboard</a>
        <a href="#sensores"><Icon name="sensors" />Sensores</a>
        <a href="#analisis"><Icon name="trending_up" />Análisis</a>
        <a href="#datos"><Icon name="description" />Datos</a>
      </nav>
    </div>
  );
}
