import Link from 'next/link';
import './home.css';

const endpoints = [
  {
    method: 'POST',
    path: '/api/iot/ingest',
    title: 'Recepcion de datos',
    description: 'Envio de telemetria desde sensores de humedad, presion, temperatura y conectividad.',
    meta: 'Rate: 10 req/s',
    action: 'Ver JSON Schema',
  },
  {
    method: 'GET',
    path: '/api/iot/latest',
    title: 'Ultima lectura',
    description: 'Consulta instantanea del estado actual de un nodo especifico.',
    meta: 'Latency: <50ms',
    action: 'Ver Demo',
  },
  {
    method: 'GET',
    path: '/api/iot/readings',
    title: 'Lecturas historicas',
    description: 'Acceso a series temporales para analisis de tendencias y crecimiento.',
    meta: 'Limit: 1000 items',
    action: 'Exportar CSV',
  },
];

export default function Home() {
  return (
    <div className="home-shell">
      <header className="home-header">
        <div className="home-header-inner">
          <Link className="home-brand" href="/">
            <span className="brand-mark">DT</span>
            <span>Data Tec Rural</span>
          </Link>
          <nav className="home-nav" aria-label="Principal">
            <a href="#endpoints">API Docs</a>
            <Link href="/nodes">Sensor Health</Link>
            <Link href="/analytics">Historical Data</Link>
          </nav>
          <Link className="header-action" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="home-main">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="system-pill">
              <span className="pulse-dot" />
              Sistema activo
            </span>
            <h1>API IoT disponible para fitomonitoreo agricola</h1>
            <p>
              Gestione la ingesta de datos, monitoree la salud de sus cultivos y consulte metricas historicas de sus nodos ESP32 en tiempo real.
            </p>
            <div className="hero-actions">
              <Link className="primary-button" href="/dashboard">
                Ver Dashboard de Datos
              </Link>
              <a className="secondary-button" href="#endpoints">
                Documentacion Completa
              </a>
            </div>
          </div>

          <div className="hero-visual" aria-label="Nodo IoT instalado en cultivo">
            <div className="sensor-card">
              <span>NODO ESP32</span>
              <strong>Online</strong>
            </div>
          </div>
        </section>

        <section className="gateway-alert" id="gateway">
          <div className="gateway-icon">IoT</div>
          <div>
            <h2>Estado del Gateway</h2>
            <p>API configurada y lista para recibir datos de nodos ESP32 remotos.</p>
          </div>
          <strong>Online</strong>
        </section>

        <section className="endpoints-section" id="endpoints">
          <div className="section-heading">
            <div>
              <h2>Endpoints de la API</h2>
              <p>Rutas principales para la integracion de hardware y analisis.</p>
            </div>
            <div className="version-tags" aria-label="Detalles API">
              <span>v2.4.0</span>
              <span>HTTPS Only</span>
            </div>
          </div>

          <div className="endpoint-grid">
            {endpoints.map((endpoint) => (
              <article className="endpoint-card" key={endpoint.path}>
                <div className="endpoint-topline">
                  <span className={`method-badge ${endpoint.method.toLowerCase()}`}>{endpoint.method}</span>
                  <span className="endpoint-glyph">{endpoint.method === 'POST' ? 'UP' : 'IN'}</span>
                </div>
                <code>{endpoint.path}</code>
                <h3>{endpoint.title}</h3>
                <p>{endpoint.description}</p>
                <div className="endpoint-footer">
                  <span>{endpoint.meta}</span>
                  <a href="#code-preview">{endpoint.action}</a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="code-preview" id="code-preview" aria-label="Ejemplo de request ESP32">
          <div className="code-toolbar">
            <span />
            <span />
            <span />
            <strong>Example Request - Arduino/ESP32</strong>
          </div>
          <pre>
            <code>{`// Configuracion de envio para ESP32
HTTPClient http;
http.begin(serverName);
http.addHeader("Content-Type", "application/json");

String httpRequestData = "{\"node_id\":\"NODE_01\", \"moisture\":42.5, \"temp\":24.2}";
int httpResponseCode = http.POST(httpRequestData);`}</code>
          </pre>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-footer-inner">
          <span>Data Tec Rural</span>
          <p>Precision Agriculture IoT.</p>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Navegacion movil">
        <a className="active" href="#endpoints">Endpoints</a>
        <Link href="/nodes">Nodes</Link>
        <Link href="/analytics">Analytics</Link>
        <a href="#top">Profile</a>
      </nav>
    </div>
  );
}
