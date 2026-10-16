import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, PackageCheck, AlertCircle, X, Check, Info, Layers, Eye, ArrowDownLeft, ArrowUpRight, FileText, Upload, Image as ImageIcon, Camera } from 'lucide-react';
import { useRole } from '../../config/rbacConfig';
import api from '../../services/api';
import '../pagesCommon.css';

export default function ProductosCatalogoPage() {
  const { user, canViewPrices: userCanViewPrices } = useRole();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Estados para el modal de Historial y Trazabilidad de Movimientos
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [historialData, setHistorialData] = useState({ producto: null, entradas: [], salidas: [] });
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialTab, setHistorialTab] = useState('entradas');

  // Estados para imagen de producto
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [formData, setFormData] = useState({
    sku: '',
    nombre: '',
    categoria_id: '',
    unidades_medida_id: '',
    stock_actual: 0,
    stock_minimo: 5,
    costo_unitario: 0,
    maneja_conversion: false,
    unidad_secundaria_id: '',
    factor_conversion: 10,
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
      setImageFile(null);
      setImagePreview(prod.imagen_url || null);
      setFormData({
        sku: prod.sku || '',
        nombre: prod.nombre || '',
        categoria_id: prod.categoria_id || prod.categoria?.id || '',
        unidades_medida_id: prod.unidades_medida_id || prod.unidad_medida?.id || '',
        stock_actual: prod.stock_actual || 0,
        stock_minimo: prod.stock_minimo || 5,
        costo_unitario: prod.costo_unitario || 0,
        maneja_conversion: Boolean(prod.maneja_conversion),
        unidad_secundaria_id: prod.unidad_secundaria_id || prod.unidad_secundaria?.id || '',
        factor_conversion: prod.factor_conversion ? Number(prod.factor_conversion) : 10,
      });
    } else {
      setEditingId(null);
      setImageFile(null);
      setImagePreview(null);
      setFormData({
        sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        nombre: '',
        categoria_id: categorias[0]?.id || '',
        unidades_medida_id: unidades[0]?.id || '',
        stock_actual: 0,
        stock_minimo: 5,
        costo_unitario: 0,
        maneja_conversion: false,
        unidad_secundaria_id: '',
        factor_conversion: 10,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submitData = new FormData();
    submitData.append('sku', formData.sku);
    submitData.append('nombre', formData.nombre);
    submitData.append('categoria_id', formData.categoria_id);
    submitData.append('unidades_medida_id', formData.unidades_medida_id);
    submitData.append('stock_actual', formData.stock_actual);
    submitData.append('stock_minimo', formData.stock_minimo);
    submitData.append('costo_unitario', formData.costo_unitario);
    submitData.append('maneja_conversion', formData.maneja_conversion ? 1 : 0);
    if (formData.maneja_conversion && formData.unidad_secundaria_id) {
      submitData.append('unidad_secundaria_id', formData.unidad_secundaria_id);
      submitData.append('factor_conversion', formData.factor_conversion || 1);
    }
    if (imageFile) {
      submitData.append('imagen', imageFile);
    }

    try {
      if (editingId) {
        submitData.append('_method', 'PUT');
        await api.post(`/productos/${editingId}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/productos', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      setShowModal(false);
      loadData();
    }
  };

  const handleOpenHistorial = async (prod) => {
    setSelectedProducto(prod);
    setShowHistorialModal(true);
    setHistorialTab('entradas');
    setHistorialData({ producto: null, entradas: [], salidas: [] });
    try {
      setLoadingHistorial(true);
      const res = await api.get(`/productos/${prod.id}/movimientos-historial`);
      if (res.data?.status === 'success') {
        setHistorialData(res.data.data);
      }
    } catch (err) {
      console.error('Error al cargar historial del producto:', err);
    } finally {
      setLoadingHistorial(false);
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
                <th style={{ width: '50px' }}>Foto</th>
                <th>SKU</th>
                <th>Nombre del Producto</th>
                <th>Categoría</th>
                <th>U. Medida</th>
                <th>Stock Total</th>
                <th>Stock por Almacén</th>
                <th>Stock Mínimo</th>
                <th>Último Precio Compra</th>
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

                const ultimoPrecio = Number(
                  item.ultimo_precio_compra !== undefined && item.ultimo_precio_compra !== null
                    ? item.ultimo_precio_compra
                    : (item.costo_unitario || item.precio_costo || 0)
                );

                return (
                  <tr key={item.id}>
                    <td>
                      {item.imagen_url ? (
                        <img
                          src={item.imagen_url}
                          alt={item.nombre}
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'block' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </td>
                    <td><strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{item.sku}</strong></td>
                    <td style={{ fontWeight: '600' }}>{item.nombre}</td>
                    <td><span className="badge badge-info">{catNombre}</span></td>
                    <td>{uniNombre}</td>
                    <td>
                      <strong style={{ color: esStockBajo ? '#dc2626' : '#0f172a', fontSize: '15px' }}>
                        {item.stock_actual}
                      </strong>
                      {item.maneja_conversion && item.stock_equivalente && (
                        <div style={{ marginTop: '3px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#1d4ed8',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              whiteSpace: 'nowrap',
                            }}
                            title={`Equivalencia en empaque secundario (Factor: ${Number(item.factor_conversion || 1)})`}
                          >
                            📦 {item.stock_equivalente}
                          </span>
                        </div>
                      )}
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
                      {userCanViewPrices ? (
                        <strong style={{ color: '#059669', fontSize: '13.5px' }}>
                          S/ {ultimoPrecio.toFixed(2)}
                        </strong>
                      ) : (
                        <span style={{ color: '#94a3b8', fontWeight: '700' }} title="Monto restringido para rol operativo">—</span>
                      )}
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
                        <button
                          className="action-btn"
                          onClick={() => handleOpenHistorial(item)}
                          title="Ver Historial y Trazabilidad (Ingresos y Despachos)"
                          style={{ color: '#2563eb' }}
                        >
                          <Eye size={16} />
                        </button>
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

                {/* SUBIDA DE IMAGEN DE PRODUCTO */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#0f172a', fontSize: '13px', marginBottom: '8px' }}>
                    <ImageIcon size={16} color="#0284c7" /> Imagen del Producto (Catálogo E-commerce)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {imagePreview ? (
                      <div style={{ position: 'relative', width: '74px', height: '74px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                        <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%', color: '#fff', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Quitar imagen"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ width: '74px', height: '74px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '1px dashed #94a3b8', flexShrink: 0 }}>
                        <Camera size={24} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        id="producto-imagen-input"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <label
                        htmlFor="producto-imagen-input"
                        className="secondary-btn"
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '6px 12px' }}
                      >
                        <Upload size={14} /> {imagePreview ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
                      </label>
                      <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                        JPG, PNG o WEBP (hasta 4MB). Se mostrará a los responsables de área en su carrito.
                      </p>
                    </div>
                  </div>
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
                    <label>Unidad de Medida (Base)</label>
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

                {/* SECCIÓN UNIDAD DE CONVERSIÓN / DOBLE UNIDAD */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: '#0f172a', fontSize: '13.5px', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={formData.maneja_conversion}
                      onChange={(e) => setFormData({ ...formData, maneja_conversion: e.target.checked })}
                      style={{ width: '17px', height: '17px', accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={16} color="#2563eb" /> Maneja Unidad de Conversión / Presentación Superior
                    </span>
                  </label>
                  <p style={{ margin: '4px 0 0 25px', fontSize: '12px', color: '#64748b' }}>
                    El stock se audita en unidades base y se calcula dinámicamente en empaques superiores (ej. Cajas, Blíster, Pallets).
                  </p>

                  {formData.maneja_conversion && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155' }}>
                          Unidad Secundaria / Empaque *
                        </label>
                        <select
                          value={formData.unidad_secundaria_id}
                          onChange={(e) => setFormData({ ...formData, unidad_secundaria_id: e.target.value })}
                          required={formData.maneja_conversion}
                          style={{ background: '#ffffff' }}
                        >
                          <option value="">-- Seleccionar (ej. Caja) --</option>
                          {unidades
                            .filter((u) => u.id !== Number(formData.unidades_medida_id))
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.nombre} ({u.simbolo || 'U'})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155' }}>
                          Factor de Conversión *
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required={formData.maneja_conversion}
                          placeholder="Ej. 10"
                          value={formData.factor_conversion}
                          onChange={(e) => setFormData({ ...formData, factor_conversion: e.target.value })}
                          style={{ background: '#ffffff' }}
                        />
                        <span style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                          1 {unidades.find((u) => u.id === Number(formData.unidad_secundaria_id))?.nombre || 'Empaque'} = {formData.factor_conversion || 1} {unidades.find((u) => u.id === Number(formData.unidades_medida_id))?.nombre || 'Unidades base'}
                        </span>
                      </div>
                    </div>
                  )}
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

                {userCanViewPrices && (
                  <div className="form-group" style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a' }}>
                      <Info size={16} color="#2563eb" /> Costo / Precio Referencial Inicial (S/)
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
                      * En la tabla del catálogo se reflejará automáticamente el último precio de compra real registrado en las Notas de Ingreso.
                    </small>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-btn"><Check size={16} /> Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL Y TRAZABILIDAD DE MOVIMIENTOS */}
      {showHistorialModal && selectedProducto && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '920px' }}>
            <div className="modal-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PackageCheck size={20} color="#2563eb" /> Historial de Movimientos y Trazabilidad
                </h3>
                <div style={{ marginTop: '3px', fontSize: '13px', color: '#475569' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bfdbfe', marginRight: '6px' }}>
                    {selectedProducto.sku}
                  </span>
                  <strong style={{ color: '#0f172a' }}>{selectedProducto.nombre}</strong>
                  <span style={{ color: '#64748b', marginLeft: '6px' }}>
                    ({selectedProducto.unidad_medida?.nombre || selectedProducto.unidad_medida?.simbolo || 'UND'})
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowHistorialModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ maxHeight: '76vh', overflowY: 'auto', padding: '20px' }}>
              {/* KPIS / RESUMEN RÁPIDO */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Stock Actual Físico</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                    {selectedProducto.stock_actual} <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>{selectedProducto.unidad_medida?.simbolo || 'u.'}</span>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11.5px', color: '#166534', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowDownLeft size={13} /> Total Ingresado (NI)
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#15803d', marginTop: '4px' }}>
                    {Number(historialData.producto?.total_ingresado ?? 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: '500' }}>{selectedProducto.unidad_medida?.simbolo || 'u.'}</span>
                  </div>
                </div>

                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11.5px', color: '#9a3412', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowUpRight size={13} /> Total Despachado (NS)
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#c2410c', marginTop: '4px' }}>
                    {Number(historialData.producto?.total_despachado ?? 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: '500' }}>{selectedProducto.unidad_medida?.simbolo || 'u.'}</span>
                  </div>
                </div>

                <div style={{ background: userCanViewPrices ? '#eff6ff' : '#f8fafc', border: `1px solid ${userCanViewPrices ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11.5px', color: userCanViewPrices ? '#1e40af' : '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Último Precio Compra</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: userCanViewPrices ? '#2563eb' : '#94a3b8', marginTop: '4px' }}>
                    {userCanViewPrices && historialData.producto?.ultimo_precio_compra !== null ? `S/ ${Number(historialData.producto?.ultimo_precio_compra ?? selectedProducto.costo_unitario ?? 0).toFixed(2)}` : '—'}
                  </div>
                </div>
              </div>

              {/* TABS DE SELECCIÓN DE BLOQUE */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setHistorialTab('entradas')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    fontWeight: '700',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    color: historialTab === 'entradas' ? '#15803d' : '#64748b',
                    borderBottom: historialTab === 'entradas' ? '3px solid #15803d' : '3px solid transparent',
                    marginBottom: '-2px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ArrowDownLeft size={16} /> Bloque 1: Historial de Ingresos (Compras)
                  <span
                    style={{
                      background: historialTab === 'entradas' ? '#dcfce7' : '#f1f5f9',
                      color: historialTab === 'entradas' ? '#166534' : '#64748b',
                      fontSize: '11px',
                      padding: '2px 7px',
                      borderRadius: '12px',
                      fontWeight: '700',
                    }}
                  >
                    {historialData.entradas?.length || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setHistorialTab('salidas')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    fontWeight: '700',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    color: historialTab === 'salidas' ? '#c2410c' : '#64748b',
                    borderBottom: historialTab === 'salidas' ? '3px solid #c2410c' : '3px solid transparent',
                    marginBottom: '-2px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ArrowUpRight size={16} /> Bloque 2: Historial de Salidas (Despachos)
                  <span
                    style={{
                      background: historialTab === 'salidas' ? '#ffedd5' : '#f1f5f9',
                      color: historialTab === 'salidas' ? '#9a3412' : '#64748b',
                      fontSize: '11px',
                      padding: '2px 7px',
                      borderRadius: '12px',
                      fontWeight: '700',
                    }}
                  >
                    {historialData.salidas?.length || 0}
                  </span>
                </button>
              </div>

              {loadingHistorial ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  Cargando trazabilidad y movimientos...
                </div>
              ) : (
                <>
                  {/* BLOQUE 1: INGRESOS */}
                  {historialTab === 'entradas' && (
                    <div>
                      {historialData.entradas?.length === 0 ? (
                        <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
                          No se registran notas de ingreso o compras para este producto.
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Fecha</th>
                                <th>Nro. Nota Ingreso</th>
                                <th>Proveedor / Origen</th>
                                <th>Almacén</th>
                                <th>Cant. Ingresada</th>
                                <th>Costo Unit.</th>
                                <th>Costo Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historialData.entradas?.map((ent) => (
                                <tr key={ent.id}>
                                  <td style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                    {ent.fecha}
                                  </td>
                                  <td>
                                    <span style={{ fontWeight: '700', color: '#15803d', fontFamily: 'monospace' }}>
                                      {ent.documento}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{ent.proveedor}</div>
                                    {ent.proveedor_ruc && (
                                      <div style={{ fontSize: '11px', color: '#64748b' }}>RUC: {ent.proveedor_ruc}</div>
                                    )}
                                  </td>
                                  <td>
                                    <span style={{ fontSize: '12px', color: '#334155' }}>
                                      {ent.almacen || 'Principal'}
                                    </span>
                                  </td>
                                  <td>
                                    <strong style={{ color: '#15803d', fontSize: '13.5px' }}>
                                      +{Number(ent.cantidad).toFixed(2)}
                                    </strong>
                                    <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>
                                      {selectedProducto.unidad_medida?.simbolo || 'u.'}
                                    </span>
                                  </td>
                                  <td style={{ color: userCanViewPrices ? '#0f172a' : '#94a3b8', fontWeight: '600' }}>
                                    {userCanViewPrices && ent.costo_unitario !== null ? `S/ ${Number(ent.costo_unitario).toFixed(2)}` : '—'}
                                  </td>
                                  <td>
                                    {userCanViewPrices && ent.costo_total !== null ? (
                                      <strong style={{ color: '#0f172a' }}>
                                        S/ {Number(ent.costo_total).toFixed(2)}
                                      </strong>
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* BLOQUE 2: SALIDAS / DESPACHOS */}
                  {historialTab === 'salidas' && (
                    <div>
                      {historialData.salidas?.length === 0 ? (
                        <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
                          No se registran salidas ni despachos para este producto.
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Fecha</th>
                                <th>Nro. Nota Salida</th>
                                <th>Trabajador / Receptor</th>
                                <th>Área / Destino</th>
                                <th>Almacén</th>
                                <th>Cant. Retirada</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historialData.salidas?.map((sal) => (
                                <tr key={sal.id}>
                                  <td style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                    {sal.fecha}
                                  </td>
                                  <td>
                                    <span style={{ fontWeight: '700', color: '#c2410c', fontFamily: 'monospace' }}>
                                      {sal.documento}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{sal.trabajador}</div>
                                    {sal.cargo && (
                                      <div style={{ fontSize: '11px', color: '#64748b' }}>Cargo: {sal.cargo}</div>
                                    )}
                                  </td>
                                  <td>
                                    <span className="badge badge-info" style={{ fontSize: '11.5px' }}>
                                      {sal.destino}
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{ fontSize: '12px', color: '#334155' }}>
                                      {sal.almacen || 'Principal'}
                                    </span>
                                  </td>
                                  <td>
                                    <strong style={{ color: '#dc2626', fontSize: '13.5px' }}>
                                      -{Number(sal.cantidad).toFixed(2)}
                                    </strong>
                                    <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>
                                      {selectedProducto.unidad_medida?.simbolo || 'u.'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowHistorialModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
