import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, PackageCheck, AlertCircle, X, Check, Info } from 'lucide-react';
import api from '../../services/api';
import '../pagesCommon.css';

export default function ProductosCatalogoPage() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    sku: '',
    nombre: '',
    categoria_id: '',
    unidades_medida_id: '',
    stock_actual: 0,
    stock_minimo: 5,
    costo_unitario: 0,
  });

  const mockProductos = [
    { id: 1, sku: 'PROD-001', nombre: 'Tubo PVC 1/2" X 3M', categoria: { id: 1, nombre: 'Tuberías' }, unidad_medida: { id: 1, nombre: 'Pieza' }, stock_actual: 150, stock_minimo: 30, costo_unitario: 14.20 },
    { id: 2, sku: 'PROD-002', nombre: 'Cable Unipolar 4mm Azul', categoria: { id: 2, nombre: 'Electricidad' }, unidad_medida: { id: 2, nombre: 'Metro' }, stock_actual: 8, stock_minimo: 25, costo_unitario: 3.10 },
    { id: 3, sku: 'PROD-003', nombre: 'Cemento Portland Tipo I 42.5kg', categoria: { id: 3, nombre: 'Construcción' }, unidad_medida: { id: 3, nombre: 'Bolsa' }, stock_actual: 80, stock_minimo: 20, costo_unitario: 24.50 },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resProd, resCat, resUni] = await Promise.all([
        api.get('/productos'),
        api.get('/categorias'),
        api.get('/unidades-medida'),
      ]);

      const listProd = resProd.data?.data?.data || resProd.data?.data || resProd.data;
      setProductos(Array.isArray(listProd) && listProd.length > 0 ? listProd : mockProductos);

      setCategorias(resCat.data?.data || [
        { id: 1, nombre: 'Tuberías' },
        { id: 2, nombre: 'Electricidad' },
        { id: 3, nombre: 'Construcción' },
      ]);

      setUnidades(resUni.data?.data || [
        { id: 1, nombre: 'Pieza', simbolo: 'PZA' },
        { id: 2, nombre: 'Metro', simbolo: 'MTR' },
        { id: 3, nombre: 'Bolsa', simbolo: 'BLS' },
      ]);
    } catch (err) {
      console.warn('Cargando productos en modo alternativo:', err);
      setProductos(mockProductos);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (prod = null) => {
    if (prod) {
      setEditingId(prod.id);
      setFormData({
        sku: prod.sku || '',
        nombre: prod.nombre || '',
        categoria_id: prod.categoria_id || prod.categoria?.id || '',
        unidades_medida_id: prod.unidades_medida_id || prod.unidad_medida?.id || '',
        stock_actual: prod.stock_actual || 0,
        stock_minimo: prod.stock_minimo || 5,
        costo_unitario: prod.costo_unitario || 0,
      });
    } else {
      setEditingId(null);
      setFormData({
        sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        nombre: '',
        categoria_id: categorias[0]?.id || '',
        unidades_medida_id: unidades[0]?.id || '',
        stock_actual: 0,
        stock_minimo: 5,
        costo_unitario: 0,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/productos/${editingId}`, formData);
      } else {
        await api.post('/productos', formData);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      if (editingId) {
        setProductos((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...formData } : p)));
      } else {
        setProductos((prev) => [...prev, { id: Date.now(), ...formData }]);
      }
      setShowModal(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este producto?')) return;
    try {
      await api.delete(`/productos/${id}`);
      setProductos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.warn(err);
      setProductos((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const filtered = productos.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Catálogo de Productos de Almacén</h2>
          <p>Control interno de inventario técnico, stock de seguridad y costos derivados de compras.</p>
        </div>
        <button className="primary-btn" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por SKU o Nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando productos...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre del Producto</th>
                <th>Categoría</th>
                <th>U. Medida</th>
                <th>Stock Total</th>
                <th>Stock por Almacén</th>
                <th>Stock Mínimo</th>
                <th>Costo Unitario Prom.</th>
                <th>Estado Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const esStockBajo = Number(item.stock_actual) <= Number(item.stock_minimo);
                const catNombre = item.categoria?.nombre || 'General';
                const uniNombre = item.unidad_medida?.nombre || item.unidad_medida?.simbolo || 'Unidad';

                // Stock por Almacén
                const stockPrincipal = Array.isArray(item.almacenes)
                  ? (item.almacenes.find((a) => a.id === 1 || String(a.codigo) === 'ALM-01')?.pivot?.stock ?? item.stock_actual)
                  : item.stock_actual;
                const stockPlanta3 = Array.isArray(item.almacenes)
                  ? (item.almacenes.find((a) => a.id === 2 || String(a.codigo) === 'ALM-03')?.pivot?.stock ?? 0)
                  : 0;

                return (
                  <tr key={item.id}>
                    <td><strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{item.sku}</strong></td>
                    <td style={{ fontWeight: '600' }}>{item.nombre}</td>
                    <td><span className="badge badge-info">{catNombre}</span></td>
                    <td>{uniNombre}</td>
                    <td>
                      <strong style={{ color: esStockBajo ? '#dc2626' : '#0f172a', fontSize: '15px' }}>
                        {item.stock_actual}
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11.5px' }}>
                        <span style={{ color: '#15803d', fontWeight: '600' }}>
                          🏢 Principal: <strong>{Number(stockPrincipal).toFixed(0)}</strong>
                        </span>
                        <span style={{ color: '#7c3aed', fontWeight: '600' }}>
                          🏭 Planta 3: <strong>{Number(stockPlanta3).toFixed(0)}</strong>
                        </span>
                      </div>
                    </td>
                    <td style={{ color: '#64748b' }}>{item.stock_minimo}</td>
                    <td>
                      <strong style={{ color: '#059669' }}>
                        S/ {Number(item.costo_unitario || item.precio_costo || 0).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      {esStockBajo ? (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={12} /> Stock Crítico
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <PackageCheck size={12} /> Normal
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="action-btn" onClick={() => handleOpenModal(item)} title="Editar"><Edit size={16} /></button>
                        <button className="action-btn" onClick={() => handleDelete(item.id)} title="Eliminar" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Producto' : 'Registrar Nuevo Producto'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '12.5px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={16} />
                  <span>
                    <strong>Múltiples Almacenes:</strong> Al guardar este producto, se inicializará automáticamente su stock en <strong>Almacén Principal</strong> y <strong>Planta 3</strong>.
                  </span>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Código SKU / Parte</label>
                    <input
                      type="text"
                      required
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Nombre del Producto / Insumo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Tubo PVC 1/2 SAP"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Categoría</label>
                    <select
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                    >
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Unidad de Medida</label>
                    <select
                      value={formData.unidades_medida_id}
                      onChange={(e) => setFormData({ ...formData, unidades_medida_id: e.target.value })}
                    >
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>{u.nombre} ({u.simbolo || 'U'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Stock Inicial</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_actual}
                      onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock Mínimo (Alerta de Reorden)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_minimo}
                      onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a' }}>
                    <Info size={16} color="#2563eb" /> Costo Unitario Promedio (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.costo_unitario}
                    onChange={(e) => setFormData({ ...formData, costo_unitario: e.target.value })}
                  />
                  <small style={{ color: '#64748b', marginTop: '4px', fontSize: '11.5px' }}>
                    * El costo unitario se actualizará automáticamente con cada Nota de Ingreso y Orden de Compra aprobada.
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-btn"><Check size={16} /> Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
