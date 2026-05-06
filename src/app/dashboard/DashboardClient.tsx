'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Node, SensorReading } from '@/types';
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

export default function DashboardClient({
  nodes,
  readings,
  filters,
}: DashboardClientProps) {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState({
    node_code: filters.node_code || '',
    start_date: filters.start_date || '',
    end_date: filters.end_date || '',
  });
  const [newNode, setNewNode] = useState({
    node_code: '',
    name: '',
    location_name: '',
    crop: '',
    wifi_ssid: '',
    wifi_password: '',
    api_token: '',
  });

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filterValues.node_code) params.set('node_code', filterValues.node_code);
    if (filterValues.start_date) params.set('start_date', filterValues.start_date);
    if (filterValues.end_date) params.set('end_date', filterValues.end_date);
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newNode),
      });
      
      if (response.ok) {
        alert('Nodo añadido con éxito');
        setNewNode({
          node_code: '',
          name: '',
          location_name: '',
          crop: '',
          wifi_ssid: '',
          wifi_password: '',
          api_token: '',
        });
        // Refresh the page to show the new node
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Error al añadir el nodo');
    }
  };

  return (
    <div className="dashboard-container">
      <h1 className="text-3xl font-bold mb-8">Dashboard de Sensores</h1>

      {/* Filter form */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Filtrar Datos</h2>
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-group">
            <label htmlFor="node_code">Nodo</label>
            <select
              id="node_code"
              value={filterValues.node_code}
              onChange={(e) => {
                setFilterValues((prev) => ({ ...prev, node_code: e.target.value }));
              }}
              className="w-full"
            >
              <option value="">Todos los nodos</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.node_code}>{
                  node.node_code} - {node.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="start_date">Fecha Inicio</label>
            <input
              type="datetime-local"
              id="start_date"
              value={filterValues.start_date}
              onChange={(e) => {
                setFilterValues((prev) => ({ ...prev, start_date: e.target.value }));
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="end_date">Fecha Fin</label>
            <input
              type="datetime-local"
              id="end_date"
              value={filterValues.end_date}
              onChange={(e) => {
                setFilterValues((prev) => ({ ...prev, end_date: e.target.value }));
              }}
            />
          </div>

          <div className="form-group flex items-end">
            <button type="submit" className="btn btn-primary">Aplicar Filtros</button>
          </div>
        </form>
      </div>

      {/* Data table */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Últimas Lecturas</h2>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nodo</th>
                <th>Ubicación</th>
                <th>Cultivo</th>
                <th>Fecha</th>
                <th>Temp. Aire (°C)</th>
                <th>Humedad Aire (%)</th>
                <th>Temp. Hoja (°C)</th>
                <th>Humedad Suelo (%)</th>
                <th>Batería (V)</th>
                <th>SSID WiFi</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading) => (
                <tr key={reading.id}>
                  <td>{reading.node_code}</td>
                  <td>{reading.location_name}</td>
                  <td>{reading.crop}</td>
                  <td>{new Date(reading.measured_at).toLocaleString()}</td>
                  <td>{reading.air_temp_c?.toFixed(1)}</td>
                  <td>{reading.air_humidity_pct?.toFixed(1)}</td>
                  <td>{reading.leaf_temp_c?.toFixed(1)}</td>
                  <td>{reading.soil_moisture_pct?.toFixed(1)}</td>
                  <td>{reading.battery_v?.toFixed(2)}</td>
                  <td>{reading.wifi_ssid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add new node form */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Añadir Nuevo Nodo</h2>
        <form onSubmit={handleAddNode} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="node_code">Código del Nodo</label>
            <input
              type="text"
              id="node_code"
              value={newNode.node_code}
              onChange={(e) => setNewNode({ ...newNode, node_code: e.target.value })}              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Nombre</label>
            <input
              type="text"
              id="name"
              value={newNode.name}
              onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location_name">Ubicación</label>
            <input
              type="text"
              id="location_name"
              value={newNode.location_name}
              onChange={(e) => setNewNode({ ...newNode, location_name: e.target.value })}              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="crop">Cultivo</label>
            <input
              type="text"
              id="crop"
              value={newNode.crop}
              onChange={(e) => setNewNode({ ...newNode, crop: e.target.value })}              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="wifi_ssid">SSID WiFi</label>
            <input
              type="text"
              id="wifi_ssid"
              value={newNode.wifi_ssid}
              onChange={(e) => setNewNode({ ...newNode, wifi_ssid: e.target.value })}              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="wifi_password">Contraseña WiFi</label>
            <input
              type="password"
              id="wifi_password"
              value={newNode.wifi_password}
              onChange={(e) => setNewNode({ ...newNode, wifi_password: e.target.value })}              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="api_token">Token de API</label>
            <input
              type="text"
              id="api_token"
              value={newNode.api_token}
              onChange={(e) => setNewNode({ ...newNode, api_token: e.target.value })}              required
            />
          </div>

          <div className="form-group flex items-end">
            <button type="submit" className="btn btn-primary">Añadir Nodo</button>
          </div>
        </form>
      </div>
    </div>
  );
}
