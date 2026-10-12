import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Plus, Save, History, CheckCircle, AlertTriangle, ArrowUpRight, ArrowDownLeft, X, Eye, Warehouse } from 'lucide-react';
import api from '../../services/api';
import { useAlmacen } from '../../context/AlmacenContext';
import '../pagesCommon.css';

export default function InventarioFisicoPage() {
  const { activeAlmacenId, almacenes } = useAlmacen();
  const [activeTab, setActiveTab] = useState('nuevo'); // 'nuevo' | 'historial'

  // Lista de productos para el conteo
  const [productosConteo, setProductosConteo] = useState([]);
  const [loadingProds, setLoadingProds] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Historial de tomas de inventario
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [selectedInventarioDetail, setSelectedInventarioDetail] = useState(null);

  // Alerta / Mensajes
  const [msg, setMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'nuevo') {
      loadProductosParaConteo();
    } else {
      loadHistorialInventarios();
    }
  }, [activeAlmacenId, activeTab]);

  const loadProductosParaConteo = async () => {
    try {
      setLoadingProds(true);
      const res = await api.get(`/productos?almacen_id=${activeAlmacenId}`);
      const list = res.data?.data?.data || res.data?.data || [];

      // Mapear cada producto con su stock del sistema e inicializar stock_fisico
      const mapped = list.map((p) => {
        const stockSistema = Number(p.stock_almacen_activo !== undefined ? p.stock_almacen_activo : p.stock_actual) || 0;
        return {
          id: p.id,
          sku: p.sku,
          nombre: p.nombre,
          categoria: p.categoria?.nombre || 'General',
          unidad_medida: p.unidad_medida?.nombre || p.unidadMedida?.nombre || 'UND',
          stock_sistema: stockSistema,
          stock_fisico: stockSistema, // por defecto igual al del sistema
        };
      });

      setProductosConteo(mapped);
    } catch (err) {
      console.error('Error al cargar productos para inventario físico:', err);
      setProductosConteo([]);
    } finally {
      setLoadingProds(false);
    }
  };

  const loadHistorialInventarios = async () => {
    try {
      setLoadingHistorial(true);
      const res = await api.get(`/inventarios-fisicos?almacen_id=${activeAlmacenId}`);
      const list = res.data?.data?.data || res.data?.data || [];
      setHistorial(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error al cargar historial de inventarios:', err);
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleStockFisicoChange = (id, val) => {
    const numVal = val === '' ? '' : Math.max(0, Number(val));
    setProductosConteo((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stock_fisico: numVal } : item))
    );
  };

  const handleSubmitAjuste = async () => {
    setMsg(null);

    // Filtrar solo los ítems válidos
    const detallesPayload = productosConteo.map((item) => ({
      producto_id: item.id,
      stock_fisico: Number(item.stock_fisico || 0),
    }));

    if (detallesPayload.length === 0) {
      setMsg({ type: 'error', text: 'No hay productos disponibles para registrar en la toma de inventario.' });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        almacen_id: activeAlmacenId,
        observaciones: observaciones || 'Ajuste de inventario físico por conteo general',
        estado: 'aplicado',
        detalles: detallesPayload,
      };

      const res = await api.post('/inventarios-fisicos', payload);

      if (res.data?.status === 'success') {
        setMsg({
          type: 'success',
          text: `¡Inventario Físico ${res.data.data.correlativo} aplicado exitosamente! Stock del almacén y Kardex actualizados.`,
        });
        setObservaciones('');
        loadProductosParaConteo();
      }
    } catch (err) {
      console.error('Error al procesar inventario:', err);
      const apiErr = err.response?.data?.message || 'Error al procesar el ajuste de inventario.';
      setMsg({ type: 'error', text: apiErr });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProds = productosConteo.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Métricas de diferencias en tiempo real
  const totalSobrantes = productosConteo.filter((p) => Number(p.stock_fisico || 0) > p.stock_sistema).length;
  const totalFaltantes = productosConteo.filter((p) => Number(p.stock_fisico || 0) < p.stock_sistema).length;
  const totalCoincidentes = productosConteo.filter((p) => Number(p.stock_fisico || 0) === p.stock_sistema).length;

  const currentAlmacenNombre = almacenes.find((a) => a.id === activeAlmacenId)?.nombre || `Almacén #${activeAlmacenId}`;

  return (
    <div className="page-container">
      {/* Cabecera Principal */}
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Toma de Inventario Físico y Ajustes de Stock</h2>
          <p>Conteo real de existencias físicas por almacén, cálculo automático de diferencias y generación de Kardex por ajuste.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`secondary-btn ${activeTab === 'nuevo' ? 'active-tab-btn' : ''}`}
            onClick={() => setActiveTab('nuevo')}
            style={activeTab === 'nuevo' ? { background: '#2563eb', color: '#fff', border: '1px solid #1d4ed8' } : {}}
          >
            <ClipboardCheck size={18} /> Nuevo Conteo
          </button>
          <button
            className={`secondary-btn ${activeTab === 'historial' ? 'active-tab-btn' : ''}`}
            onClick={() => setActiveTab('historial')}
            style={activeTab === 'historial' ? { background: '#2563eb', color: '#fff', border: '1px solid #1d4ed8' } : {}}
          >
            <History size={18} /> Historial de Ajustes
          </button>
        </div>
      </div>

      {msg && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`,
            color: msg.type === 'success' ? '#166534' : '#991b1b',
          }}
        >
          {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* PESTAÑA 1: NUEVO CONTEO */}
      {activeTab === 'nuevo' && (
        <>
          {/* Tarjeta de Resumen en Tiempo Real */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700' }}>Ubicación Activa</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Warehouse size={18} color="#2563eb" /> {currentAlmacenNombre}
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#16a34a', fontWeight: '700' }}>Sobrantes (Ajuste +)</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>{totalSobrantes} ítems</div>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#dc2626', fontWeight: '700' }}>Faltantes (Ajuste -)</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>{totalFaltantes} ítems</div>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#2563eb', fontWeight: '700' }}>Conteo Coincidente</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>{totalCoincidentes} ítems</div>
            </div>
          </div>

          {/* Tabla de Conteo Interactivo */}
          <div className="table-card">
            <div className="table-toolbar" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div className="search-input-wrapper" style={{ minWidth: '320px' }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Filtrar por SKU, nombre o categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Observaciones de la toma de inventario..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', width: '300px' }}
                />

                <button
                  className="primary-btn"
                  onClick={handleSubmitAjuste}
                  disabled={submitting || loadingProds || productosConteo.length === 0}
                  style={{ background: '#16a34a' }}
                >
                  <Save size={18} /> {submitting ? 'Procesando Ajuste...' : 'Aplicar Ajuste de Inventario'}
                </button>
              </div>
            </div>

            {loadingProds ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Cargando productos e inventario teórico del almacén...
              </div>
            ) : filteredProds.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                No se encontraron productos registrados en este almacén.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>N°</th>
                    <th style={{ width: '15%' }}>SKU</th>
                    <th style={{ width: '35%' }}>Producto / Descripción</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Stock Sistema</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Stock Físico Real</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Diferencia (Ajuste)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProds.map((row, idx) => {
                    const stockSis = row.stock_sistema;
                    const stockFis = Number(row.stock_fisico !== '' ? row.stock_fisico : 0);
                    const diff = stockFis - stockSis;

                    return (
                      <tr key={row.id}>
                        <td style={{ color: '#64748b', fontWeight: '700' }}>{idx + 1}</td>
                        <td>
                          <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>{row.sku}</strong>
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{row.nombre}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {row.categoria} | {row.unidad_medida}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <strong style={{ fontSize: '15px', color: '#334155' }}>{stockSis.toFixed(2)} u.</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={row.stock_fisico}
                            onChange={(e) => handleStockFisicoChange(row.id, e.target.value)}
                            style={{
                              width: '110px',
                              padding: '6px 10px',
                              textAlign: 'center',
                              fontSize: '15px',
                              fontWeight: '800',
                              border: diff !== 0 ? (diff > 0 ? '2px solid #16a34a' : '2px solid #dc2626') : '1px solid #cbd5e1',
                              borderRadius: '8px',
                              background: diff !== 0 ? (diff > 0 ? '#f0fdf4' : '#fef2f2') : '#ffffff',
                              color: diff !== 0 ? (diff > 0 ? '#15803d' : '#b91c1c') : '#0f172a',
                              outline: 'none',
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {diff > 0 ? (
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px' }}>
                              <ArrowDownLeft size={13} /> +{diff.toFixed(2)} (Sobrante)
                            </span>
                          ) : diff < 0 ? (
                            <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px' }}>
                              <ArrowUpRight size={13} /> {diff.toFixed(2)} (Faltante)
                            </span>
                          ) : (
                            <span className="badge badge-info" style={{ fontSize: '12.5px' }}>
                              Conforme (0.00)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* PESTAÑA 2: HISTORIAL DE INVENTARIOS */}
      {activeTab === 'historial' && (
        <div className="table-card">
          {loadingHistorial ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando historial de tomas de inventario...</div>
          ) : historial.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No hay registros de inventarios físicos en este almacén.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Correlativo</th>
                  <th>Fecha y Hora</th>
                  <th>Almacén</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th>Observaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <strong style={{ fontFamily: 'monospace', color: '#2563eb', fontSize: '14px' }}>{inv.correlativo}</strong>
                    </td>
                    <td>{new Date(inv.fecha || inv.created_at).toLocaleString('es-PE')}</td>
                    <td>
                      <span className="badge badge-purple">{inv.almacen?.nombre || currentAlmacenNombre}</span>
                    </td>
                    <td>{inv.user?.name || 'Administrador'}</td>
                    <td>
                      <span className={`badge ${inv.estado === 'aplicado' ? 'badge-success' : 'badge-warning'}`}>
                        {inv.estado ? inv.estado.toUpperCase() : 'APLICADO'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12.5px', color: '#475569' }}>{inv.observaciones || 'Sin observaciones'}</td>
                    <td>
                      <button className="action-btn" onClick={() => setSelectedInventarioDetail(inv)} title="Ver Detalle">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL DETALLE DE HISTORIAL */}
      {selectedInventarioDetail && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3>Detalle de Inventario Físico - {selectedInventarioDetail.correlativo}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedInventarioDetail(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div><strong>Almacén:</strong> {selectedInventarioDetail.almacen?.nombre}</div>
                <div><strong>Fecha:</strong> {new Date(selectedInventarioDetail.fecha).toLocaleString('es-PE')}</div>
                <div><strong>Responsable:</strong> {selectedInventarioDetail.user?.name || 'Sistema'}</div>
                <div><strong>Estado:</strong> {selectedInventarioDetail.estado?.toUpperCase()}</div>
              </div>

              <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Productos y Diferencias Registradas</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th style={{ textAlign: 'center' }}>Sistema</th>
                    <th style={{ textAlign: 'center' }}>Conteo Real</th>
                    <th style={{ textAlign: 'center' }}>Ajuste</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInventarioDetail.detalles?.map((d) => (
                    <tr key={d.id}>
                      <td><strong style={{ fontFamily: 'monospace' }}>{d.producto?.sku}</strong></td>
                      <td>{d.producto?.nombre}</td>
                      <td style={{ textAlign: 'center' }}>{Number(d.stock_sistema).toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}><strong>{Number(d.stock_fisico).toFixed(2)}</strong></td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${Number(d.diferencia) > 0 ? 'badge-success' : Number(d.diferencia) < 0 ? 'badge-danger' : 'badge-info'}`}>
                          {Number(d.diferencia) > 0 ? `+${Number(d.diferencia).toFixed(2)}` : Number(d.diferencia).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="primary-btn" onClick={() => setSelectedInventarioDetail(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
