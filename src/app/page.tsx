export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Data TecRural
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Sistema de Fitomonitoreo Agrícola con IoT
          </p>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              API IoT Disponible
            </h2>
            <div className="text-left space-y-2">
              <p><strong>POST /api/iot/ingest</strong> - Recepción de datos de sensores</p>
              <p><strong>GET /api/iot/latest</strong> - Última lectura de un nodo</p>
              <p><strong>GET /api/iot/readings</strong> - Lecturas históricas</p>
            </div>
            <div className="mt-6 p-4 bg-green-50 rounded-md">
              <p className="text-green-800">
                ✅ API configurada y lista para recibir datos de ESP32
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}