import React, { useState, useEffect } from 'react';
import { DollarSign, Download, Filter, PackageCheck } from 'lucide-react';
import api from '../../services/api';
import '../pagesCommon.css';

export default function KardexValorizadoPage() {
  const [valorizadoData, setValorizadoData] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [selectedAlmacenId, setSelectedAlmacenId] = useState('');
  const [valorTotalGeneral, setValorTotalGeneral] = useState(0);
  const [totalItemsFisicos, setTotalItemsFisicos] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const resAlm = await api.get('/almacenes');
      const dataAlm = resAlm.data?.data || resAlm.data;
      setAlmacenes(Array.isArray(dataAlm) ? dataAlm : []);
    } catch (err) {
      console.warn('Error al cargar almacenes:', err);
    }
    loadValorizadoData('');
  };

  const loadValorizadoData = async (almId = selectedAlmacenId) => {
    try {
      setLoading(true);
      let url = '/kardex/valorizado';
      if (almId) {
        url += `?almacen_id=${almId}`;
      }
      const res = await api.get(url);
      if (res.data?.status === 'success') {
        const d = res.data.data;
        setValorizadoData(d.productos || []);
        setValorTotalGeneral(Number(d.valor_total_general || 0));
        setTotalItemsFisicos(Number(d.total_items_fisicos || 0));
      }
    } catch (err) {
      console.error('Error al cargar Kardex Valorizado:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAlmacenFilterChange = (e) => {
    const almId = e.target.value;
    setSelectedAlmacenId(almId);
    loadValorizadoData(almId);
  };

  const handleExportExcel = () => {
    alert('Generando archivo Excel del Kardex Valorizado para auditoría...');
  };

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Kardex Valorizado (Control Financiero de Inventario)</h2>
          <p>Valorización contable en tiempo real calculada por el método de Promedio Ponderado por Almacén.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>🏢 Filtrar Almacén:</span>
            <select
              value={selectedAlmacenId}
              onChange={handleAlmacenFilterChange}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontWeight: '700',
                color: '#059669',
                background: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">-- Todos los Almacenes --</option>
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.codigo})
                </option>
              ))}
            </select>
          </div>
          <button className="primary-btn" onClick={handleExportExcel} style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
            <Download size={18} /> Exportar Excel / SUNAT
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info">
            <span>Valor Total en Moneda Nacional (PEN)</span>
            <h3 style={{ color: '#059669' }}>
              S/ {valorTotalGeneral.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span>Total de Unidades Físicas Registradas</span>
            <h3 style={{ color: '#2563eb' }}>
              {totalItemsFisicos.toLocaleString('es-PE')} u.
            </h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <PackageCheck size={24} />
          </div>
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando valorización de inventario contable...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Descripción de Producto</th>
                <th>Categoría</th>
                <th>Costo Unitario Prom.</th>
                <th>Stock Físico Actual</th>
                <th>Valor Total Acumulado</th>
                <th>Método Valuación</th>
              </tr>
            </thead>
            <tbody>
              {valorizadoData.map((v) => (
                <tr key={v.id}>
                  <td><strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{v.sku}</strong></td>
                  <td style={{ fontWeight: '600' }}>{v.producto}</td>
                  <td><span className="badge badge-info">{v.categoria}</span></td>
                  <td>S/ {Number(v.costo_unitario || 0).toFixed(2)}</td>
                  <td><strong>{Number(v.stock_fisico || 0).toFixed(2)} {v.unidad_medida || 'u.'}</strong></td>
                  <td>
                    <strong style={{ color: '#059669', fontSize: '15px' }}>
                      S/ {Number(v.valor_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </td>
                  <td><span className="badge badge-purple">{v.metodo || 'Promedio Ponderado'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
