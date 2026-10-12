import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, Package, ShoppingCart, ShieldAlert, CheckCircle, RefreshCw, Warehouse, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAlmacen } from '../../context/AlmacenContext';
import '../pagesCommon.css';

export default function StockCriticoPage() {
  const navigate = useNavigate();
  const { activeAlmacenId, almacenes } = useAlmacen();

  const [criticos, setCriticos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlmacenId, setFilterAlmacenId] = useState(activeAlmacenId || '');

  useEffect(() => {
    fetchStockCritico();
  }, [filterAlmacenId]);

  const fetchStockCritico = async () => {
    try {
      setLoading(true);
      let url = '/reportes/stock-critico';
      if (filterAlmacenId) {
        url += `?almacen_id=${filterAlmacenId}`;
      }
      const res = await api.get(url);
      const list = res.data?.data || [];
      setCriticos(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error al cargar reporte de stock crítico:', err);
      setCriticos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearRequerimiento = (item) => {
    // Redirigir al módulo de requerimientos con el producto pre-seleccionado
    navigate('/requerimientos', {
      state: {
        producto_id: item.id,
        producto_sku: item.sku,
        producto_nombre: item.nombre,
        cantidad_sugerida: item.deficit > 0 ? item.deficit : item.stock_minimo,
      },
    });
  };

  const filtered = criticos.filter(
    (item) =>
      item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAgotados = criticos.filter((i) => i.stock_actual === 0).length;
  const totalBajoMinimo = criticos.filter((i) => i.stock_actual > 0 && i.stock_actual <= i.stock_minimo).length;
  const totalDeficitAcumulado = criticos.reduce((sum, i) => sum + i.deficit, 0);

  return (
    <div className="page-container">
      {/* Cabecera Principal */}
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Alertas y Monitoreo de Stock Crítico</h2>
          <p>Supervisión en tiempo real de insumos y productos por debajo del stock mínimo de seguridad.</p>
        </div>
        <button className="primary-btn" onClick={fetchStockCritico} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar Reporte
        </button>
      </div>

      {/* Tarjetas de Métricas de Alerta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1px solid #fca5a5' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#991b1b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} color="#dc2626" /> Total Productos Críticos
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626', marginTop: '6px' }}>
            {criticos.length} <span style={{ fontSize: '13px', fontWeight: '600' }}>ítems</span>
          </div>
        </div>

        <div style={{ background: '#7f1d1d', padding: '16px', borderRadius: '12px', border: '1px solid #991b1b', color: '#ffffff' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#fca5a5', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={16} color="#fca5a5" /> Sin Stock (Agotados 0 u.)
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', marginTop: '6px' }}>
            {totalAgotados} <span style={{ fontSize: '13px', fontWeight: '500' }}>productos</span>
          </div>
        </div>

        <div style={{ background: '#fff7ed', padding: '16px', borderRadius: '12px', border: '1px solid #fdba74' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#9a3412', fontWeight: '700' }}>Por Debajo del Mínimo</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#ea580c', marginTop: '6px' }}>
            {totalBajoMinimo} <span style={{ fontSize: '13px', fontWeight: '600' }}>ítems</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700' }}>Déficit de Reposición Total</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#2563eb', marginTop: '6px' }}>
            {totalDeficitAcumulado.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: '600' }}>unidades</span>
          </div>
        </div>
      </div>

      {/* Toolbar y Tabla */}
      <div className="table-card">
        <div className="table-toolbar" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div className="search-input-wrapper" style={{ minWidth: '320px' }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por SKU, producto o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Warehouse size={16} color="#0284c7" /> Almacén:
            </label>
            <select
              value={filterAlmacenId}
              onChange={(e) => setFilterAlmacenId(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                background: '#ffffff',
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
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Analizando existencias y niveles mínimos de stock...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#16a34a' }}>
            <CheckCircle size={36} style={{ marginBottom: '8px', opacity: 0.8 }} />
            <div style={{ fontWeight: '700', fontSize: '16px' }}>¡Inventario en Niveles Óptimos!</div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              No se registran productos con stock por debajo del límite mínimo de seguridad en la ubicación seleccionada.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto / Descripción</th>
                <th>Ubicación Almacén</th>
                <th style={{ textAlign: 'center' }}>Stock Actual</th>
                <th style={{ textAlign: 'center' }}>Stock Mínimo</th>
                <th style={{ textAlign: 'center' }}>Déficit a Reponer</th>
                <th style={{ textAlign: 'center' }}>Nivel de Alerta</th>
                <th style={{ textAlign: 'center' }}>Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={`${item.id}-${item.almacen_id}`}>
                  <td>
                    <strong style={{ fontFamily: 'monospace', color: '#2563eb', fontSize: '13.5px' }}>{item.sku}</strong>
                  </td>
                  <td>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.nombre}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {item.categoria} | {item.unidad_medida}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                      {item.almacen_nombre}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <strong style={{ fontSize: '15px', color: item.stock_actual === 0 ? '#dc2626' : '#ea580c' }}>
                      {item.stock_actual.toFixed(2)} {item.unidad_medida}
                    </strong>
                  </td>
                  <td style={{ textAlign: 'center', color: '#475569', fontWeight: '600' }}>
                    {item.stock_minimo.toFixed(2)} {item.unidad_medida}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: '800', color: '#dc2626' }}>
                      +{item.deficit.toFixed(2)} {item.unidad_medida}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {item.stock_actual === 0 ? (
                      <span className="badge" style={{ background: '#7f1d1d', color: '#ffffff', border: '1px solid #991b1b', fontWeight: '800' }}>
                        🚫 AGOTADO (0.00)
                      </span>
                    ) : (
                      <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={12} /> CRÍTICO (&le; Mínimo)
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="primary-btn"
                      onClick={() => handleCrearRequerimiento(item)}
                      style={{ padding: '6px 12px', fontSize: '12px', background: '#2563eb' }}
                      title="Generar Requerimiento de Compra / Reabastecimiento"
                    >
                      <ShoppingCart size={14} /> Solicitud Compra <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
