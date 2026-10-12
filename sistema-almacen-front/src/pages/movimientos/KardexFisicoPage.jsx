import React, { useState, useEffect } from 'react';
import { FileText, Search, ArrowDownLeft, ArrowUpRight, Package, Box } from 'lucide-react';
import { useRole } from '../../config/rbacConfig';
import api from '../../services/api';
import '../pagesCommon.css';

export default function KardexFisicoPage() {
  const { user, canViewPrices: userCanViewPrices } = useRole();

  const [productosList, setProductosList] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedAlmacenId, setSelectedAlmacenId] = useState('');
  const [selectedProductData, setSelectedProductData] = useState(null);
  const [kardexEntries, setKardexEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingKardex, setLoadingKardex] = useState(false);

  useEffect(() => {
    loadProductosAndAlmacenes();
  }, []);

  const loadProductosAndAlmacenes = async () => {
    try {
      setLoading(true);
      const [resProd, resAlm] = await Promise.all([
        api.get('/productos'),
        api.get('/almacenes'),
      ]);

      const dataProd = resProd.data?.data?.data || resProd.data?.data || resProd.data;
      const listProd = Array.isArray(dataProd) ? dataProd : [];
      setProductosList(listProd);

      const dataAlm = resAlm.data?.data || resAlm.data;
      const listAlm = Array.isArray(dataAlm) ? dataAlm : [];
      setAlmacenes(listAlm);

      if (listProd.length > 0) {
        setSelectedProductId(listProd[0].id);
        fetchKardexForProduct(listProd[0].id, '');
      }
    } catch (err) {
      console.error('Error al cargar catálogo de productos o almacenes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchKardexForProduct = async (prodId, almId = selectedAlmacenId) => {
    if (!prodId) return;
    try {
      setLoadingKardex(true);
      let url = `/kardex/producto/${prodId}`;
      if (almId) {
        url += `?almacen_id=${almId}`;
      }
      const res = await api.get(url);
      if (res.data?.status === 'success') {
        setSelectedProductData(res.data.data.producto);
        setKardexEntries(res.data.data.movimientos || []);
      }
    } catch (err) {
      console.error('Error al cargar kardex del producto:', err);
      setKardexEntries([]);
    } finally {
      setLoadingKardex(false);
    }
  };

  const handleProductChange = (e) => {
    const prodId = e.target.value;
    setSelectedProductId(prodId);
    fetchKardexForProduct(prodId, selectedAlmacenId);
  };

  const handleAlmacenFilterChange = (e) => {
    const almId = e.target.value;
    setSelectedAlmacenId(almId);
    fetchKardexForProduct(selectedProductId, almId);
  };

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Kardex Físico de Productos</h2>
          <p>Trazabilidad física de movimientos reales: Entradas (+), Salidas (-) y Saldo final en unidades de stock por Almacén.</p>
        </div>
      </div>

      {/* Selector de Producto y Almacén */}
      <div className="table-card" style={{ padding: '16px 20px', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Filter Almacén */}
            <label style={{ fontWeight: '700', fontSize: '13.5px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🏢 Almacén:
            </label>
            <select
              value={selectedAlmacenId}
              onChange={handleAlmacenFilterChange}
              style={{
                padding: '9px 14px',
                border: '1px solid #94a3b8',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: '700',
                outline: 'none',
                background: '#ffffff',
                color: '#15803d',
              }}
            >
              <option value="">-- Todos los Almacenes --</option>
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.codigo})
                </option>
              ))}
            </select>

            {/* Select Producto */}
            <label style={{ fontWeight: '700', fontSize: '13.5px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
              <Package size={18} color="#2563eb" /> Producto:
            </label>
            <select
              value={selectedProductId}
              onChange={handleProductChange}
              disabled={loading}
              style={{
                padding: '9px 14px',
                border: '1px solid #94a3b8',
                borderRadius: '8px',
                fontSize: '13.5px',
                minWidth: '320px',
                fontWeight: '600',
                outline: 'none',
                background: '#ffffff',
              }}
            >
              {productosList.length === 0 ? (
                <option value="">Cargando catálogo...</option>
              ) : (
                productosList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.nombre} (Stock Total: {p.stock_actual} u.)
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedProductData && (
            <div style={{ display: 'flex', gap: '16px', background: '#ffffff', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div>
                <small style={{ color: '#64748b', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: '700' }}>Stock Físico</small>
                <div style={{ color: '#16a34a', fontWeight: '800', fontSize: '16px' }}>{selectedProductData.stock_actual} u.</div>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
                <small style={{ color: '#64748b', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: '700' }}>Costo Promedio</small>
                <div style={{ color: userCanViewPrices ? '#2563eb' : '#94a3b8', fontWeight: '800', fontSize: '16px' }}>
                  {userCanViewPrices && selectedProductData.costo_unitario !== null ? `S/ ${Number(selectedProductData.costo_unitario || 0).toFixed(2)}` : '—'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabla del Kardex Físico Transaccional */}
      <div className="table-card">
        {loadingKardex ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando trazabilidad física del producto...</div>
        ) : kardexEntries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <Box size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <div>No se registraron movimientos físicos aún para este producto en el almacén seleccionado.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Fecha y Hora</th>
                <th>Almacén</th>
                <th>Tipo Movimiento</th>
                <th>Documento Sustento</th>
                <th>Entrada (+)</th>
                <th>Salida (-)</th>
                <th>Saldo Físico</th>
                <th>Observación / Detalle</th>
              </tr>
            </thead>
            <tbody>
              {kardexEntries.map((row, index) => (
                <tr key={row.id || index}>
                  <td style={{ color: '#64748b', fontWeight: '700' }}>{index + 1}</td>
                  <td>{row.fecha}</td>
                  <td>
                    <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                      {row.almacen?.nombre || (row.almacen_id === 2 ? 'Planta 3' : 'Almacén Principal')}
                    </span>
                  </td>
                  <td>
                    {row.tipo?.includes('ENTRADA') || row.tipo === 'INGRESO' ? (
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowDownLeft size={12} /> ENTRADA
                      </span>
                    ) : row.tipo?.includes('SALIDA') ? (
                      <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowUpRight size={12} /> SALIDA
                      </span>
                    ) : (
                      <span className="badge badge-info">SALDO INICIAL</span>
                    )}
                  </td>
                  <td><strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>{row.doc}</strong></td>
                  <td>
                    <span style={{ color: Number(row.entrada) > 0 ? '#16a34a' : '#94a3b8', fontWeight: Number(row.entrada) > 0 ? '700' : 'normal' }}>
                      {Number(row.entrada) > 0 ? `+${Number(row.entrada).toFixed(2)}` : '-'}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: Number(row.salida) > 0 ? '#dc2626' : '#94a3b8', fontWeight: Number(row.salida) > 0 ? '700' : 'normal' }}>
                      {Number(row.salida) > 0 ? `-${Number(row.salida).toFixed(2)}` : '-'}
                    </span>
                  </td>
                  <td><strong style={{ color: '#0f172a', fontSize: '15px' }}>{Number(row.saldo_fisico !== undefined ? row.saldo_fisico : row.saldo).toFixed(2)} u.</strong></td>
                  <td style={{ color: '#475569', fontSize: '12.5px' }}>{row.observacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
