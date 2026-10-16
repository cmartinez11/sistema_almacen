import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Filter,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Package,
  Layers,
  Send,
  Building,
  User,
  Info,
  Calendar,
  Check,
} from 'lucide-react';
import { useRole } from '../../config/rbacConfig';
import api from '../../services/api';
import './SolicitudesAreaPage.css';

export default function SolicitudesAreaPage() {
  const { user } = useRole();

  // Estados principales
  const [activeTab, setActiveTab] = useState('catalogo'); // 'catalogo' | 'solicitudes'
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [soloConStock, setSoloConStock] = useState(false);

  // Carrito de compras de requerimientos
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('area_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [quantities, setQuantities] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState({});

  // Formulario de envío de pre-requerimiento
  const [prioridad, setPrioridad] = useState('media');
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [successModal, setSuccessModal] = useState(null);

  const [areaDestino, setAreaDestino] = useState('');

  // Lista de pre-requerimientos históricos del área
  const [misSolicitudes, setMisSolicitudes] = useState([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);

  const areaUsuario = user?.area || 'Sistemas';
  const nombreUsuario = user?.name || user?.nombres || 'Responsable de Área';

  useEffect(() => {
    localStorage.setItem('area_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (activeTab === 'solicitudes') {
      loadMisSolicitudes();
    }
  }, [activeTab]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const [resProd, resCat] = await Promise.all([
        api.get('/productos'),
        api.get('/categorias'),
      ]);

      const listProd = resProd.data?.data?.data || resProd.data?.data || resProd.data;
      if (Array.isArray(listProd)) {
        setProductos(listProd);
      }

      const listCat = resCat.data?.data || resCat.data;
      if (Array.isArray(listCat)) {
        setCategorias(listCat);
      }
    } catch (err) {
      console.error('Error al cargar catálogo de productos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMisSolicitudes = async () => {
    try {
      setLoadingSolicitudes(true);
      const res = await api.get('/pre-requerimientos', {
        params: { todos: 1, area: areaUsuario },
      });
      if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
        setMisSolicitudes(res.data.data);
      }
    } catch (err) {
      console.error('Error al cargar pre-requerimientos:', err);
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  // Manejo de cantidades en las tarjetas
  const getQty = (prodId) => quantities[prodId] || 1;
  const updateQty = (prodId, delta) => {
    setQuantities((prev) => {
      const current = prev[prodId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [prodId]: next };
    });
  };

  const handleSetQty = (prodId, val) => {
    const num = parseInt(val, 10);
    setQuantities((prev) => ({
      ...prev,
      [prodId]: isNaN(num) || num < 1 ? 1 : num,
    }));
  };

  // Agregar al carrito
  const addToCart = (prod) => {
    const qty = getQty(prod.id);
    setCart((prev) => {
      const existing = prev.find((item) => item.producto_id === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.producto_id === prod.id
            ? { ...item, cantidad_solicitada: item.cantidad_solicitada + qty }
            : item
        );
      }
      return [
        ...prev,
        {
          producto_id: prod.id,
          nombre: prod.nombre,
          sku: prod.sku,
          imagen_url: prod.imagen_url,
          unidad_medida: prod.unidad_medida?.nombre || prod.unidad_medida?.simbolo || 'UND',
          stock_actual: Number(prod.stock_actual || 0),
          cantidad_solicitada: qty,
        },
      ];
    });

    // Reset cantidad y animación
    setQuantities((prev) => ({ ...prev, [prod.id]: 1 }));
    setAddedAnimation((prev) => ({ ...prev, [prod.id]: true }));
    setTimeout(() => {
      setAddedAnimation((prev) => ({ ...prev, [prod.id]: false }));
    }, 1200);
  };

  const updateCartItemQty = (prodId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.producto_id === prodId) {
            const newQty = item.cantidad_solicitada + delta;
            return newQty > 0 ? { ...item, cantidad_solicitada: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeCartItem = (prodId) => {
    setCart((prev) => prev.filter((item) => item.producto_id !== prodId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Enviar orden de pre-requerimiento
  const handleSubmitPreRequerimiento = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!areaDestino) {
      alert('Por favor seleccione un área de destino');
      return;
    }

    try {
      setEnviando(true);
      const payload = {
        personal_id: user?.personal_id || 1,
        area: areaUsuario,
        prioridad: prioridad,
        area_destino: areaDestino,
        observaciones: observaciones,
        detalles: cart.map((item) => ({
          producto_id: item.producto_id,
          cantidad_solicitada: item.cantidad_solicitada,
        })),
      };

      const res = await api.post('/pre-requerimientos', payload);

      if (res.data?.status === 'success') {
        const createdReq = res.data.data;

        // Disparar evento y persistir alerta para Almacén / Compras / Administrador
        try {
          const reqAlert = {
            id: createdReq.id,
            codigo: createdReq.correlativo || createdReq.codigo || `REQ-${createdReq.id}`,
            area_destino: areaDestino || createdReq.area || 'General',
            solicitante: nombreUsuario,
            prioridad: prioridad || createdReq.prioridad || 'media',
            timestamp: Date.now(),
          };
          localStorage.setItem('nuevo_prereq_alerta', JSON.stringify(reqAlert));
          window.dispatchEvent(new Event('nuevoPreRequerimiento'));
          window.dispatchEvent(new Event('storage'));
        } catch (e) {
          console.warn('Error al persistir nuevo_prereq_alerta:', e);
        }

        setSuccessModal(createdReq);
        setCart([]);
        setAreaDestino('');
        setObservaciones('');
        setIsCartOpen(false);
      } else {
        alert(res.data?.message || 'Error al procesar el pre-requerimiento');
      }
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.message ||
        'Error al conectar con el servidor para emitir el pre-requerimiento.'
      );
    } finally {
      setEnviando(false);
    }
  };

  // Total de unidades en el carrito
  const totalItemsEnCarrito = cart.reduce((sum, i) => sum + i.cantidad_solicitada, 0);

  // Filtrado de productos
  const productosFiltrados = productos.filter((p) => {
    const matchTerm =
      p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCat =
      selectedCategory === 'todas' ||
      String(p.categoria_id) === String(selectedCategory) ||
      p.categoria?.nombre?.toLowerCase() === selectedCategory.toLowerCase();

    const matchStock = !soloConStock || Number(p.stock_actual) > 0;

    return matchTerm && matchCat && matchStock;
  });

  return (
    <div className="ecommerce-container">
      {/* BANNER PRINCIPAL DE ÁREA TIPO E-COMMERCE */}
      <div className="ecommerce-banner">
        <div className="banner-left">
          <h2>Catálogo de Suministros & Solicitudes de Área</h2>
          <p>
            Selecciona los materiales o insumos que necesita tu área de trabajo. Los pedidos
            generarán un Pre-requerimiento enviado directamente a Almacén Central.
          </p>
          <div className="area-pill">
            <Building size={14} /> Área Responsable: <strong>{areaUsuario}</strong> • <User size={14} /> {nombreUsuario}
          </div>
        </div>

        <div className="banner-tabs">
          <button
            className={`tab-btn ${activeTab === 'catalogo' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalogo')}
          >
            <ShoppingBag size={18} /> Catálogo de Materiales
          </button>
          <button
            className={`tab-btn ${activeTab === 'solicitudes' ? 'active' : ''}`}
            onClick={() => setActiveTab('solicitudes')}
          >
            <Clock size={18} /> Mis Solicitudes
            {misSolicitudes.length > 0 && (
              <span style={{ background: '#0284c7', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>
                {misSolicitudes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'catalogo' ? (
        <>
          {/* BARRA DE BÚSQUEDA Y FILTROS POR CATEGORÍA */}
          <div className="ecommerce-toolbar">
            <div className="search-box-ecommerce">
              <Search size={18} color="#64748b" />
              <input
                type="text"
                placeholder="Buscar por nombre de producto o código SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={soloConStock}
                  onChange={(e) => setSoloConStock(e.target.checked)}
                  style={{ accentColor: '#0284c7', width: '16px', height: '16px' }}
                />
                Solo con stock físico
              </label>

              <button
                className="floating-cart-btn"
                style={{ position: 'static', padding: '10px 18px', fontSize: '14px' }}
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart size={18} />
                <span>Ver Carrito</span>
                {totalItemsEnCarrito > 0 && (
                  <span className="cart-count-badge">{totalItemsEnCarrito}</span>
                )}
              </button>
            </div>
          </div>

          {/* FILTROS RÁPIDOS POR CATEGORÍA (PILLS) */}
          <div className="category-pills">
            <button
              className={`cat-pill-btn ${selectedCategory === 'todas' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('todas')}
            >
              ✨ Todas las Categorías ({productos.length})
            </button>
            {categorias.map((c) => (
              <button
                key={c.id}
                className={`cat-pill-btn ${String(selectedCategory) === String(c.id) ? 'active' : ''}`}
                onClick={() => setSelectedCategory(String(c.id))}
              >
                {c.nombre}
              </button>
            ))}
          </div>

          {/* GRID DE PRODUCTOS E-COMMERCE */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <Package size={40} style={{ animation: 'bounce 1s infinite' }} />
              <p style={{ marginTop: '12px' }}>Cargando catálogo para {areaUsuario}...</p>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <Package size={48} color="#cbd5e1" />
              <h3 style={{ color: '#334155', marginTop: '12px' }}>No se encontraron productos</h3>
              <p style={{ color: '#64748b', fontSize: '14px' }}>
                Prueba ajustando el término de búsqueda o cambiando el filtro de categoría.
              </p>
            </div>
          ) : (
            <div className="products-ecommerce-grid">
              {productosFiltrados.map((prod) => {
                const stock = Number(prod.stock_actual || 0);
                const hasStock = stock > 0;
                const unit = prod.unidad_medida?.nombre || prod.unidad_medida?.simbolo || 'UND';
                const isAdded = addedAnimation[prod.id];

                return (
                  <div key={prod.id} className="product-card-ecommerce">
                    <div className="card-image-wrapper">
                      {prod.imagen_url ? (
                        <img
                          src={prod.imagen_url}
                          alt={prod.nombre}
                          className="card-product-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="placeholder-img"
                        style={{ display: prod.imagen_url ? 'none' : 'flex' }}
                      >
                        <Package size={38} />
                        <span style={{ fontSize: '11px', fontWeight: '500' }}>Sin Imagen</span>
                      </div>
                      <span className="card-cat-badge">
                        {prod.categoria?.nombre || 'General'}
                      </span>
                    </div>

                    <div className="card-body-ecommerce">
                      <div className="card-sku">{prod.sku}</div>
                      <h4 className="card-title" title={prod.nombre}>
                        {prod.nombre}
                      </h4>

                      <div className="card-stock-row">
                        <span className={`stock-pill ${hasStock ? 'in-stock' : 'no-stock'}`}>
                          {hasStock ? (
                            <>
                              <CheckCircle2 size={12} /> Stock: <strong>{stock}</strong>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={12} /> Agotado (Se comprará)
                            </>
                          )}
                        </span>
                        <span className="card-unit">({unit})</span>
                      </div>

                      {/* CONTROLES DE CANTIDAD Y AGREGAR */}
                      <div className="card-controls">
                        <div className="qty-counter">
                          <button
                            className="qty-btn"
                            onClick={() => updateQty(prod.id, -1)}
                            title="Disminuir"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            className="qty-input"
                            min="1"
                            value={getQty(prod.id)}
                            onChange={(e) => handleSetQty(prod.id, e.target.value)}
                          />
                          <button
                            className="qty-btn"
                            onClick={() => updateQty(prod.id, 1)}
                            title="Aumentar"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          className={`add-cart-btn ${isAdded ? 'added' : ''}`}
                          onClick={() => addToCart(prod)}
                        >
                          {isAdded ? (
                            <>
                              <Check size={16} /> ¡Agregado!
                            </>
                          ) : (
                            <>
                              <Plus size={16} /> Agregar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* VISTA: MIS SOLICITUDES Y SEGUIMIENTO */
        <div className="solicitudes-list-container">
          {loadingSolicitudes ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              Cargando historial de solicitudes...
            </div>
          ) : misSolicitudes.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <Clock size={48} color="#cbd5e1" />
              <h3 style={{ color: '#334155', marginTop: '12px' }}>Aún no has generado pre-requerimientos</h3>
              <p style={{ color: '#64748b', fontSize: '14px' }}>
                Ve al Catálogo de Materiales, añade los insumos que tu área requiera y pulsa en "Confirmar Pre-requerimiento".
              </p>
              <button
                className="tab-btn active"
                style={{ margin: '16px auto 0 auto', background: '#0284c7', color: '#fff' }}
                onClick={() => setActiveTab('catalogo')}
              >
                <ShoppingBag size={16} /> Ir al Catálogo
              </button>
            </div>
          ) : (
            misSolicitudes.map((req) => {
              const statusPill = {
                pre_requerimiento: { bg: '#fef3c7', text: '#d97706', label: '🟡 En Revisión por Almacén' },
                pendiente: { bg: '#e0f2fe', text: '#0284c7', label: '🔵 Derivado a Cotización (Compras)' },
                aprobado: { bg: '#dcfce7', text: '#15803d', label: '🟢 Aprobado / Despachado' },
                rechazado: { bg: '#fee2e2', text: '#dc2626', label: '🔴 Rechazado por Almacén' },
              }[req.estado] || { bg: '#f1f5f9', text: '#475569', label: req.estado };

              return (
                <div key={req.id} className="solicitud-card">
                  <div className="solicitud-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#0284c7', fontSize: '15px' }}>
                          {req.correlativo}
                        </span>
                        <span
                          style={{
                            background: statusPill.bg,
                            color: statusPill.text,
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '700',
                          }}
                        >
                          {statusPill.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        Solicitado el: <strong>{new Date(req.fecha_solicitud || req.created_at).toLocaleString()}</strong> • Prioridad: <strong style={{ textTransform: 'capitalize' }}>{req.prioridad}</strong>
                      </div>
                    </div>
                  </div>

                  {req.observaciones && (
                    <div style={{ fontSize: '12.5px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', color: '#334155', marginBottom: '12px' }}>
                      <strong>Notas / Observaciones:</strong> {req.observaciones}
                    </div>
                  )}

                  <table className="data-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Producto / Insumo</th>
                        <th>U. Medida</th>
                        <th>Cant. Solicitada</th>
                        <th>Disponibilidad en Almacén</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(req.detalles || []).map((d) => (
                        <tr key={d.id}>
                          <td>
                            <strong>{d.producto?.nombre || 'Producto'}</strong>
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>
                              {d.producto?.sku}
                            </div>
                          </td>
                          <td>{d.producto?.unidad_medida?.nombre || d.producto?.unidad_medida?.simbolo || 'UND'}</td>
                          <td>
                            <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                              {d.cantidad_solicitada}
                            </strong>
                          </td>
                          <td>
                            {d.tiene_stock ? (
                              <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ Con Stock Físico</span>
                            ) : (
                              <span style={{ color: '#d97706', fontWeight: '600' }}>⚠️ Requiere Compra Externa</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CARRITO LATERAL / DRAWER FLOTANTE */}
      {isCartOpen && (
        <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <h3>
                <ShoppingCart size={20} color="#0284c7" /> Carrito de Requerimiento
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                  ({cart.length} ítems)
                </span>
              </h3>
              <button className="drawer-close-btn" onClick={() => setIsCartOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="cart-drawer-items">
              {cart.length === 0 ? (
                <div className="empty-cart-state">
                  <ShoppingCart size={48} color="#cbd5e1" />
                  <h4>Tu carrito está vacío</h4>
                  <p style={{ fontSize: '13px' }}>
                    Explora el catálogo y agrega los productos que necesitas para tu área.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.producto_id} className="cart-item-row">
                    {item.imagen_url ? (
                      <img src={item.imagen_url} alt={item.nombre} className="cart-item-thumb" />
                    ) : (
                      <div className="cart-item-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={22} color="#94a3b8" />
                      </div>
                    )}

                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.nombre}</div>
                      <div className="cart-item-sku">{item.sku}</div>
                      <div className="cart-item-unit">Medida: {item.unidad_medida}</div>
                    </div>

                    <div className="qty-counter" style={{ background: '#fff' }}>
                      <button
                        className="qty-btn"
                        onClick={() => updateCartItemQty(item.producto_id, -1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ padding: '0 8px', fontSize: '13px', fontWeight: '700' }}>
                        {item.cantidad_solicitada}
                      </span>
                      <button
                        className="qty-btn"
                        onClick={() => updateCartItemQty(item.producto_id, 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeCartItem(item.producto_id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      title="Eliminar del carrito"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <form onSubmit={handleSubmitPreRequerimiento} className="cart-drawer-footer">
                <div className="cart-metadata-form">
                  <div>
                    <label className="cart-field-label">Nivel de Prioridad:</label>
                    <select
                      value={prioridad}
                      onChange={(e) => setPrioridad(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', marginTop: '4px' }}
                    >
                      <option value="baja">🟢 Baja (Rutinario / Reposición regular)</option>
                      <option value="media">🟡 Media (Uso en los próximos días)</option>
                      <option value="alta">🔴 Alta / Urgente (Parada o falla de área)</option>
                    </select>
                  </div>

                  <div>
                    <label className="cart-field-label">
                      Justificación:
                    </label>
                    <textarea
                      required
                      placeholder="Ej. Requerido para mantenimiento preventivo en sala técnica de Sistemas..."
                      className="cart-textarea"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                    />
                  </div>

                  {/* 1. Nuevo selector de Área de Destino */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Área de Destino:
                    </label>
                    <select
                      value={areaDestino}
                      onChange={(e) => setAreaDestino(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        backgroundColor: '#fff',
                        color: '#0f172a'
                      }}
                    >
                      <option value="">-- Seleccione un área --</option>
                      <option value="Sistemas">Sistemas</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Producción">Producción</option>
                      <option value="Logística / Almacén">Logística / Almacén</option>
                      <option value="Calidad">Calidad</option>
                      <option value="Seguridad (SSOMA)">Seguridad (SSOMA)</option>
                      <option value="Administración">Administración</option>
                      <option value="Contabilidad">Contabilidad</option>
                    </select>
                  </div>
                </div>

                <div className="cart-summary-row">
                  <span>Total de Productos a Solicitar:</span>
                  <span style={{ color: '#0284c7' }}>{totalItemsEnCarrito} unidades</span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={clearCart}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                  >
                    Vaciar
                  </button>
                  <button
                    type="submit"
                    className="submit-prereq-btn"
                    style={{ flex: 1 }}
                    disabled={enviando}
                  >
                    {enviando ? (
                      'Procesando...'
                    ) : (
                      <>
                        <Send size={16} /> Confirmar Pre-requerimiento
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN / ÉXITO */}
      {successModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '28px' }}>
            <div style={{ width: '64px', height: '64px', background: '#ecfdf5', borderRadius: '50%', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <CheckCircle2 size={38} />
            </div>

            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '20px' }}>
              ¡Pre-requerimiento Emitido con Éxito!
            </h3>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', margin: '16px 0' }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Código de Solicitud Generado:</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#0284c7', fontFamily: 'monospace', marginTop: '4px' }}>
                {successModal.correlativo}
              </div>
            </div>

            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.4', margin: '0 0 20px 0' }}>
              Tu solicitud ha sido transmitida a la bandeja central de Almacén. Si los productos cuentan con stock disponible se emitirá la salida inmediata; en caso contrario, Compras gestionará la cotización.
            </p>

            <button
              className="primary-btn"
              style={{ width: '100%', justifyContent: 'center', background: '#0284c7' }}
              onClick={() => {
                setSuccessModal(null);
                setActiveTab('solicitudes');
              }}
            >
              Ver Mis Solicitudes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
