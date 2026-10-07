import React, { useState, useEffect } from 'react';
import { Plus, ClipboardList, CheckCircle2, XCircle, Clock, X, Check, Trash2, Search, Warehouse, UserCheck, Eye, FileDown, ShoppingCart, DollarSign, Truck } from 'lucide-react';
import { normalizeRole, ROLES } from '../../config/rbacConfig';
import api from '../../services/api';
import '../pagesCommon.css';

export default function RequerimientosPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = normalizeRole(user);

  const [requerimientos, setRequerimientos] = useState([]);
  const [proveedoresList, setProveedoresList] = useState([]);
  const [personalList, setPersonalList] = useState([]);
  const [productosList, setProductosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bandeja');
  
  // Modal de Creación (Sin Precios)
  const [showModal, setShowModal] = useState(false);
  const [asignarEspecial, setAsignarEspecial] = useState(false);

  // Modal de Cotización / Emitir OC (Área de Compras)
  const [showCotizarModal, setShowCotizarModal] = useState(false);
  const [cotizarReq, setCotizarReq] = useState(null);
  const [cotizarProveedorId, setCotizarProveedorId] = useState('');
  const [cotizarDetalles, setCotizarDetalles] = useState([]);

  // Modal de Detalles de Ítems (Visualizador)
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);

  // Modal de Gestión de Saldos Pendientes (Compras)
  const [showSaldoModal, setShowSaldoModal] = useState(false);
  const [saldoReq, setSaldoReq] = useState(null);

  // Formulario cabecera (crear solicitud sin precios)
  const [formHeader, setFormHeader] = useState({
    personal_id: '',
    area: '',
    prioridad: 'media',
    observaciones: '',
  });

  const [detalles, setDetalles] = useState([
    { producto_id: '', cantidad_solicitada: 1 },
  ]);

  const mockRequerimientos = [
    {
      id: 1,
      correlativo: 'REQ-2026-0089',
      personal: null,
      area: null,
      fecha_solicitud: '2026-10-06T10:30:00',
      prioridad: 'alta',
      estado: 'pendiente',
      detalles: [
        { producto_id: 1, cantidad_solicitada: 500, costo_unitario: 0, producto: { sku: 'PROD-002', nombre: 'Cable Unipolar 4mm Azul', unidadMedida: { nombre: 'Metro' } } },
        { producto_id: 2, cantidad_solicitada: 200, costo_unitario: 0, producto: { sku: 'PROD-001', nombre: 'Tubo PVC 1/2" X 3M', unidadMedida: { nombre: 'Pieza' } } },
      ],
    },
    {
      id: 2,
      correlativo: 'REQ-2026-0088',
      personal: { nombres: 'Roberto', apellidos: 'Silva' },
      area: 'Operaciones',
      fecha_solicitud: '2026-10-05T14:15:00',
      prioridad: 'media',
      estado: 'aprobado',
      detalles: [
        { producto_id: 3, cantidad_solicitada: 20, costo_unitario: 0, producto: { sku: 'PROD-005', nombre: 'Guantes de Nitrilo Talla L', unidadMedida: { nombre: 'Par' } } }
      ],
    },
    {
      id: 3,
      correlativo: 'REQ-2026-0087',
      personal: null,
      area: null,
      fecha_solicitud: '2026-10-04T09:00:00',
      prioridad: 'baja',
      estado: 'pedido',
      proveedor: { razon_social: 'DISTRIBUIDORA ELECTRICA S.A.C.' },
      detalles: [
        { producto_id: 1, cantidad_solicitada: 50, costo_unitario: 12.50, producto: { sku: 'PROD-002', nombre: 'Cable Unipolar 4mm Azul', unidadMedida: { nombre: 'Metro' } } }
      ],
    },
    {
      id: 4,
      correlativo: 'REQ-2026-0085',
      personal: { nombres: 'Juan', apellidos: 'Pérez' },
      area: 'Planta Industrial',
      fecha_solicitud: '2026-10-03T11:00:00',
      prioridad: 'alta',
      estado: 'parcial',
      proveedor: { razon_social: 'FERRETERIA INDUSTRIAL SRL' },
      detalles: [
        { producto_id: 1, cantidad_solicitada: 100, cantidad_recibida: 80, cantidad_pendiente: 20, costo_unitario: 15.00, producto: { sku: 'PROD-002', nombre: 'Cable Unipolar 4mm Azul', unidadMedida: { nombre: 'Metro' } } },
        { producto_id: 2, cantidad_solicitada: 50, cantidad_recibida: 50, cantidad_pendiente: 0, costo_unitario: 8.50, producto: { sku: 'PROD-001', nombre: 'Tubo PVC 1/2" X 3M', unidadMedida: { nombre: 'Pieza' } } },
      ],
    },
  ];

  const mockPersonalList = [
    { id: 1, nombres: 'Cristhian Alexander', apellidos: 'Martinez Castro', cargo: 'Operario de Almacén' },
    { id: 2, nombres: 'Roberto', apellidos: 'Silva', cargo: 'Supervisor de Operaciones' },
    { id: 3, nombres: 'Juan', apellidos: 'Pérez', cargo: 'Técnico de Mantenimiento' },
  ];

  const mockProductosList = [
    { id: 1, sku: 'PROD-001', nombre: 'Lapicero Faber Castell 0.5mm Azul', costo_unitario: 1.50 },
    { id: 2, sku: 'PROD-002', nombre: 'Cable Unipolar 4mm Azul', costo_unitario: 12.50 },
    { id: 3, sku: 'PROD-003', nombre: 'Tubo PVC 1/2" X 3M', costo_unitario: 8.50 },
    { id: 4, sku: 'PROD-004', nombre: 'Guantes de Nitrilo Talla L', costo_unitario: 6.50 },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resReq, resPers, resProd, resProv] = await Promise.all([
        api.get('/requerimientos'),
        api.get('/personal'),
        api.get('/productos'),
        api.get('/proveedores'),
      ]);

      const dataReq = resReq.data?.data || resReq.data;
      setRequerimientos(Array.isArray(dataReq) && dataReq.length > 0 ? dataReq : mockRequerimientos);

      const parsedPers = Array.isArray(resPers.data?.data?.data)
        ? resPers.data.data.data
        : Array.isArray(resPers.data?.data)
        ? resPers.data.data
        : Array.isArray(resPers.data)
        ? resPers.data
        : mockPersonalList;

      setPersonalList(parsedPers.length > 0 ? parsedPers : mockPersonalList);

      const parsedProd = Array.isArray(resProd.data?.data?.data)
        ? resProd.data.data.data
        : Array.isArray(resProd.data?.data)
        ? resProd.data.data
        : Array.isArray(resProd.data)
        ? resProd.data
        : mockProductosList;

      setProductosList(parsedProd.length > 0 ? parsedProd : mockProductosList);

      const dataProv = resProv.data?.data || resProv.data;
      setProveedoresList(Array.isArray(dataProv) ? dataProv : []);
    } catch (err) {
      console.warn('Usando datos de respaldo para Requerimientos:', err);
      setRequerimientos(mockRequerimientos);
      setPersonalList(mockPersonalList);
      setProductosList(mockProductosList);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    if (productosList.length === 0) {
      loadData();
    }
    setAsignarEspecial(false);
    setFormHeader({
      personal_id: '',
      area: '',
      prioridad: 'media',
      observaciones: '',
    });
    const firstProdId = productosList[0]?.id || mockProductosList[0]?.id || '';
    setDetalles([
      { producto_id: firstProdId, cantidad_solicitada: 10 },
    ]);
    setShowModal(true);
  };

  const handleAddRow = () => {
    setDetalles([
      ...detalles,
      { producto_id: productosList[0]?.id || '', cantidad_solicitada: 1 },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (detalles.length === 1) return;
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...detalles];
    updated[index][field] = value;
    setDetalles(updated);
  };

  // Crear Requerimiento (ALMACENERO) - Sin precios
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fechaActualSistema = new Date().toISOString();

      const payload = {
        personal_id: asignarEspecial ? formHeader.personal_id || null : null,
        area: asignarEspecial ? formHeader.area || null : null,
        fecha_solicitud: fechaActualSistema,
        prioridad: formHeader.prioridad,
        observaciones: formHeader.observaciones,
        detalles: detalles.map((d) => ({
          producto_id: d.producto_id,
          cantidad_solicitada: Number(d.cantidad_solicitada),
        })),
      };

      await api.post('/requerimientos', payload);
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al enviar la solicitud de requerimiento.');
    }
  };

  // Abrir Modal para Cotizar y Emitir Orden de Compra (COMPRAS)
  const handleOpenCotizarModal = (req) => {
    setCotizarReq(req);
    setCotizarProveedorId(req.proveedor_id || proveedoresList[0]?.id || '');
    const items = (req.detalles || req.requerimiento_detalles || []).map((d) => ({
      id: d.id,
      producto_id: d.producto_id,
      producto_nombre: d.producto?.nombre || 'Producto',
      producto_sku: d.producto?.sku || 'SKU',
      cantidad_solicitada: d.cantidad_solicitada || 1,
      costo_unitario: Number(d.costo_unitario || d.producto?.costo_unitario || 0),
    }));
    setCotizarDetalles(items);
    setShowCotizarModal(true);
  };

  const handleCotizarChange = (index, field, value) => {
    const updated = [...cotizarDetalles];
    updated[index][field] = value;
    setCotizarDetalles(updated);
  };

  const calculateCotizacionTotal = () => {
    return cotizarDetalles.reduce(
      (sum, item) => sum + Number(item.cantidad_solicitada) * Number(item.costo_unitario),
      0
    );
  };

  // Guardar Cotización y Transicionar a "PEDIDO"
  const handleSubmitCotizacion = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        proveedor_id: cotizarProveedorId,
        estado: 'pedido',
        detalles: cotizarDetalles.map((d) => ({
          id: d.id,
          producto_id: d.producto_id,
          cantidad_solicitada: Number(d.cantidad_solicitada),
          costo_unitario: Number(d.costo_unitario),
        })),
      };

      await api.put(`/requerimientos/${cotizarReq.id}/cotizar`, payload);
      setShowCotizarModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al emitir la Orden de Compra.');
    }
  };

  const handleOpenItemsModal = (req) => {
    setSelectedReq(req);
    setShowItemsModal(true);
  };

  const handleOpenSaldoModal = (req) => {
    setSaldoReq(req);
    setShowSaldoModal(true);
  };

  const handleCerrarFaltante = async (id) => {
    if (!window.confirm('¿Está seguro de cerrar y descartar el saldo pendiente de esta Orden de Compra? Las unidades faltantes ya no se esperarán y la orden quedará CERRADA.')) {
      return;
    }
    try {
      await api.put(`/requerimientos/${id}/cerrar-faltante`);
      setShowSaldoModal(false);
      loadData();
    } catch (err) {
      console.warn(err);
      setRequerimientos((prev) =>
        prev.map((r) => (r.id === id ? { ...r, estado: 'cerrado' } : r))
      );
      setShowSaldoModal(false);
    }
  };

  const handleExportPdf = (req) => {
    const pdfUrl = `http://127.0.0.1:8000/api/requerimientos/${req.id}/pdf`;
    window.open(pdfUrl, '_blank');
  };

  const handleAprobar = async (id) => {
    try {
      await api.put(`/requerimientos/${id}/aprobar`);
      loadData();
    } catch (err) {
      console.warn(err);
      setRequerimientos((prev) =>
        prev.map((r) => (r.id === id ? { ...r, estado: 'aprobado' } : r))
      );
    }
  };

  const handleRechazar = async (id) => {
    try {
      await api.put(`/requerimientos/${id}/rechazar`);
      loadData();
    } catch (err) {
      console.warn(err);
      setRequerimientos((prev) =>
        prev.map((r) => (r.id === id ? { ...r, estado: 'rechazado' } : r))
      );
    }
  };

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Requerimientos de Materiales y Órdenes de Compra</h2>
          <p>Flujo de compras: Almacenero solicita (sin precios) → Compras cotiza y emite OC (estado PEDIDO) → Almacén recepciona.</p>
        </div>
        <button className="primary-btn" onClick={handleOpenModal}>
          <Plus size={18} /> Crear Solicitud (Almacén)
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('bandeja')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderBottom: activeTab === 'bandeja' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'bandeja' ? '#2563eb' : '#64748b',
          }}
        >
          📥 Bandeja General (Compras)
        </button>
        <button
          onClick={() => setActiveTab('saldos')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderBottom: activeTab === 'saldos' ? '3px solid #eab308' : '3px solid transparent',
            color: activeTab === 'saldos' ? '#ca8a04' : '#64748b',
          }}
        >
          ⚠️ Saldos & Faltantes Parciales
        </button>
        <button
          onClick={() => setActiveTab('mis-solicitudes')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderBottom: activeTab === 'mis-solicitudes' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'mis-solicitudes' ? '#2563eb' : '#64748b',
          }}
        >
          📄 Histórico de Requerimientos
        </button>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando requerimientos...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Código Req.</th>
                <th>Destino / Solicitante</th>
                <th>Proveedor Asignado</th>
                <th>Fecha Solicitud</th>
                <th>Ítems Solicitados</th>
                <th>Prioridad</th>
                <th>Estado Flujo</th>
                <th>Acciones de Compras</th>
              </tr>
            </thead>
            <tbody>
              {requerimientos
                .filter((req) => (activeTab === 'saldos' ? req.estado === 'parcial' : true))
                .map((req) => {
                  const totalItemsCount = req.detalles?.length || req.requerimiento_detalles?.length || 0;

                  return (
                    <tr key={req.id}>
                      <td>
                        <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>
                          {req.correlativo || `REQ-2026-00${req.id}`}
                        </strong>
                      </td>
                      <td>
                        {req.personal ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <UserCheck size={14} color="#2563eb" />
                            <strong style={{ color: '#0f172a' }}>{req.personal.nombres} {req.personal.apellidos}</strong>
                          </div>
                        ) : (
                          <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Warehouse size={12} /> Reposición Stock Almacén
                          </span>
                        )}
                      </td>
                      <td>
                        {req.proveedor ? (
                          <strong style={{ color: '#16a34a', fontSize: '13px' }}>{req.proveedor.razon_social}</strong>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>Por cotizar</span>
                        )}
                      </td>
                      <td>
                        {req.fecha_solicitud
                          ? new Date(req.fecha_solicitud).toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : new Date().toLocaleDateString('es-PE')}
                      </td>
                      <td>
                        <button
                          className="secondary-btn"
                          onClick={() => handleOpenItemsModal(req)}
                          style={{ padding: '5px 12px', fontSize: '12.5px', background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}
                        >
                          <Eye size={14} /> Ver [{totalItemsCount}] ítems
                        </button>
                      </td>
                      <td>
                        {req.prioridad === 'alta' && <span className="badge badge-danger">ALTA</span>}
                        {req.prioridad === 'media' && <span className="badge badge-warning">MEDIA</span>}
                        {req.prioridad === 'baja' && <span className="badge badge-info">BAJA</span>}
                      </td>
                      <td>
                        {(req.estado === 'pendiente' || !req.estado) && (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> PENDIENTE COMPRAS
                          </span>
                        )}
                        {req.estado === 'pedido' && (
                          <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f3e8ff', color: '#7e22ce' }}>
                            <ShoppingCart size={12} /> PEDIDO (OC EMITIDA)
                          </span>
                        )}
                        {req.estado === 'aprobado' && (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> APROBADO
                          </span>
                        )}
                        {req.estado === 'parcial' && (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#a16207' }}>
                            <Clock size={12} /> PARCIAL (FALTANTE)
                          </span>
                        )}
                        {req.estado === 'cerrado' && (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569' }}>
                            <CheckCircle2 size={12} /> CERRADO / COMPLETADO
                          </span>
                        )}
                        {req.estado === 'rechazado' && (
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={12} /> RECHAZADO
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {/* 1. ESTADO PENDIENTE: Mostrar botones [Aprobar] y [Rechazar] */}
                          {(req.estado === 'pendiente' || !req.estado) && (
                            <>
                              {(role === ROLES.COMPRAS || role === ROLES.ADMINISTRADOR) && (
                                <>
                                  <button
                                    className="primary-btn"
                                    onClick={() => handleAprobar(req.id)}
                                    style={{ padding: '5px 10px', fontSize: '12px', background: '#16a34a', borderColor: '#16a34a' }}
                                    title="Aprobar Requerimiento"
                                  >
                                    <CheckCircle2 size={14} /> Aprobar
                                  </button>
                                  <button
                                    className="secondary-btn"
                                    onClick={() => handleRechazar(req.id)}
                                    style={{ padding: '5px 10px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                                    title="Rechazar Requerimiento"
                                  >
                                    <XCircle size={14} /> Rechazar
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          {/* 2. ESTADO APROBADO: Mostrar botón [Cotizar / OC] */}
                          {req.estado === 'aprobado' && (
                            <>
                              {(role === ROLES.COMPRAS || role === ROLES.ADMINISTRADOR) && (
                                <button
                                  className="primary-btn"
                                  onClick={() => handleOpenCotizarModal(req)}
                                  style={{ padding: '5px 10px', fontSize: '12px', background: '#2563eb' }}
                                  title="Cotizar y Emitir Orden de Compra"
                                >
                                  <ShoppingCart size={14} /> Cotizar / OC
                                </button>
                              )}
                            </>
                          )}

                          {/* 3. ESTADO PARCIAL: Mostrar botón [Gestionar Saldo] */}
                          {req.estado === 'parcial' && (
                            <>
                              {(role === ROLES.COMPRAS || role === ROLES.ADMINISTRADOR) && (
                                <button
                                  className="primary-btn"
                                  onClick={() => handleOpenSaldoModal(req)}
                                  style={{ padding: '5px 10px', fontSize: '12px', background: '#ca8a04', borderColor: '#ca8a04' }}
                                  title="Gestionar Saldo y Faltante Pendiente"
                                >
                                  ⚠️ Gestionar Saldo
                                </button>
                              )}
                            </>
                          )}

                          {/* 4. Exportar PDF siempre visible */}
                          <button
                            className="secondary-btn"
                            onClick={() => handleExportPdf(req)}
                            title="Exportar Orden PDF"
                            style={{ padding: '5px 8px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            <FileDown size={14} /> PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL 1: CREAR SOLICITUD DE REQUERIMIENTO (SIN PRECIOS) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h3>Crear Nueva Solicitud de Requerimiento (Almacén)</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: '600', color: '#0f172a' }}>
                    <input
                      type="checkbox"
                      checked={asignarEspecial}
                      onChange={(e) => setAsignarEspecial(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    ¿Asignar este requerimiento a un trabajador / área específica?
                  </label>
                </div>

                {!asignarEspecial ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Warehouse size={16} /> Requerimiento registrado como <strong>Reposición de Stock General para el Almacén</strong>.
                  </div>
                ) : (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Trabajador Solicitante (Opcional)</label>
                      <select
                        value={formHeader.personal_id}
                        onChange={(e) => setFormHeader({ ...formHeader, personal_id: e.target.value })}
                        style={{ fontSize: '13.5px' }}
                      >
                        <option value="">-- Seleccionar Trabajador --</option>
                        {personalList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.apellidos && p.nombres
                              ? `${p.apellidos}, ${p.nombres}`
                              : (p.nombres || p.apellidos || `Trabajador #${p.id}`)}
                            {p.cargo ? ` (${p.cargo})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Área Requeridora (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej. Operaciones / Planta"
                        value={formHeader.area}
                        onChange={(e) => setFormHeader({ ...formHeader, area: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Nivel de Prioridad</label>
                  <select
                    value={formHeader.prioridad}
                    onChange={(e) => setFormHeader({ ...formHeader, prioridad: e.target.value })}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta / Urgente</option>
                  </select>
                </div>

                {/* DETALLES DINÁMICOS DE PRODUCTOS (SIN PRECIOS) */}
                <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Productos a Solicitar (Solo Cantidades)</h4>
                    <button type="button" className="secondary-btn" onClick={handleAddRow} style={{ padding: '4px 10px', fontSize: '12.5px' }}>
                      <Plus size={14} /> Añadir Producto
                    </button>
                  </div>

                  {detalles.map((row, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 40px', gap: '10px', alignItems: 'center', marginBottom: '10px', background: '#f8fafc', padding: '8px', borderRadius: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b' }}>Producto Requerido</label>
                        <select
                          required
                          value={row.producto_id}
                          onChange={(e) => handleItemChange(idx, 'producto_id', e.target.value)}
                          style={{ padding: '8px', fontSize: '13px' }}
                        >
                          <option value="">-- Seleccionar Producto --</option>
                          {productosList.map((prod) => {
                            const skuVal = prod.sku || prod.codigo_sku || `PROD-${prod.id}`;
                            const nomVal = prod.nombre || prod.nombre_producto || 'Producto Sin Nombre';
                            return (
                              <option key={prod.id} value={prod.id}>
                                {skuVal} - {nomVal}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b' }}>Cant. Solicitada</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.cantidad_solicitada}
                          onChange={(e) => handleItemChange(idx, 'cantidad_solicitada', e.target.value)}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginTop: '16px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-btn">
                  <Check size={16} /> Enviar Solicitud a Compras
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COTIZAR Y EMITIR ORDEN DE COMPRA (COMPRAS / ADMIN) */}
      {showCotizarModal && cotizarReq && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '800px' }}>
            <div className="modal-header" style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
              <div>
                <h3 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={20} /> Cotizar & Emitir Orden de Compra (OC)
                </h3>
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700', fontFamily: 'monospace' }}>
                  {cotizarReq.correlativo}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowCotizarModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmitCotizacion}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="form-group" style={{ background: '#ffffff', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '10px' }}>
                  <label style={{ fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={16} color="#2563eb" /> Seleccionar Proveedor Ganador / Cotizado
                  </label>
                  <select
                    required
                    value={cotizarProveedorId}
                    onChange={(e) => setCotizarProveedorId(e.target.value)}
                    style={{ fontSize: '14px', fontWeight: '600' }}
                  >
                    <option value="">-- Seleccionar Proveedor --</option>
                    {proveedoresList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.razon_social} (RUC: {p.ruc})
                      </option>
                    ))}
                  </select>
                </div>

                <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px', color: '#0f172a' }}>
                  Asignación de Precios Unitarios y Ajuste de Cantidades Aprobadas:
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cotizarDetalles.map((row, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1fr', gap: '12px', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <strong style={{ fontSize: '12px', color: '#2563eb', fontFamily: 'monospace', display: 'block' }}>
                          {row.producto_sku}
                        </strong>
                        <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#0f172a' }}>
                          {row.producto_nombre}
                        </span>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b' }}>Cant. Pedido</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.cantidad_solicitada}
                          onChange={(e) => handleCotizarChange(idx, 'cantidad_solicitada', e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b' }}>Costo Unit. (S/)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="0.00"
                          value={row.costo_unitario}
                          onChange={(e) => handleCotizarChange(idx, 'costo_unitario', e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b' }}>Subtotal</label>
                        <strong style={{ display: 'block', padding: '8px', background: '#ffffff', borderRadius: '6px', fontSize: '13px', color: '#16a34a' }}>
                          S/ {(Number(row.cantidad_solicitada) * Number(row.costo_unitario)).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: 'right', marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                  <span style={{ fontSize: '13px', color: '#166534', fontWeight: '600' }}>VALOR TOTAL ORDEN DE COMPRA: </span>
                  <strong style={{ color: '#15803d', fontSize: '20px', marginLeft: '8px' }}>
                    S/ {calculateCotizacionTotal().toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowCotizarModal(false)}>Cancelar</button>
                <button type="submit" className="primary-btn" style={{ background: '#16a34a' }}>
                  <Check size={16} /> Confirmar & Emitir Orden de Compra (PEDIDO)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VISUALIZADOR DETALLADO DE ÍTEMS Y BOTÓN PDF */}
      {showItemsModal && selectedReq && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Detalle de Ítems Solicitados</h3>
                <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '700', fontFamily: 'monospace' }}>
                  {selectedReq.correlativo || `REQ-2026-00${selectedReq.id}`}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowItemsModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-body">
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Destino / Solicitante:</strong> {selectedReq.personal ? `${selectedReq.personal.nombres} ${selectedReq.personal.apellidos}` : 'Reposición General Almacén'}</div>
                <div><strong>Proveedor Asignado:</strong> {selectedReq.proveedor?.razon_social || 'Pendiente de cotización'}</div>
                <div><strong>Fecha de Emisión:</strong> {selectedReq.fecha_solicitud ? new Date(selectedReq.fecha_solicitud).toLocaleString('es-PE') : '2026-10-06'}</div>
              </div>

              <h4 style={{ margin: '12px 0 8px 0', fontSize: '14px', color: '#0f172a' }}>Lista de Productos:</h4>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Cant. Solicitada</th>
                    <th>Costo Unit. (S/)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedReq.detalles || selectedReq.requerimiento_detalles || []).map((d, index) => {
                    const prodObj = d.producto || productosList.find((p) => p.id === d.producto_id) || {};
                    return (
                      <tr key={index}>
                        <td><strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>{prodObj.sku || 'SKU'}</strong></td>
                        <td style={{ fontWeight: '600' }}>{prodObj.nombre || 'Producto General'}</td>
                        <td>
                          <span className="badge badge-info" style={{ fontSize: '13px', fontWeight: '700' }}>
                            {d.cantidad_solicitada} u.
                          </span>
                        </td>
                        <td>
                          <strong>S/ {Number(d.costo_unitario || 0).toFixed(2)}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                className="secondary-btn"
                onClick={() => handleExportPdf(selectedReq)}
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
              >
                <FileDown size={16} /> Exportar Orden PDF
              </button>
              <button className="primary-btn" onClick={() => setShowItemsModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: GESTIÓN DE SALDOS Y FALTANTES PARCIALES (ÁREA DE COMPRAS) */}
      {showSaldoModal && saldoReq && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '780px' }}>
            <div className="modal-header" style={{ background: '#fefce8', borderBottom: '1px solid #fef08a' }}>
              <div>
                <h3 style={{ margin: 0, color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚠️ Gestión de Saldos & Faltantes por Recibir
                </h3>
                <span style={{ fontSize: '12px', color: '#a16207', fontWeight: '700', fontFamily: 'monospace' }}>
                  {saldoReq.correlativo} - Proveedor: {saldoReq.proveedor?.razon_social || 'Proveedor Cotizado'}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowSaldoModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', color: '#713f12', padding: '12px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
                ⚠️ <strong>Atención Compras:</strong> Esta Orden de Compra fue recepcionada parcialmente en almacén. Revise las cantidades entregadas vs. los saldos pendientes y elija si esperar el lote complementario o cerrar el faltante.
              </div>

              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>Balance de Unidades por Producto:</h4>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th style={{ textStyle: 'center' }}>Solicitada Original</th>
                    <th style={{ textStyle: 'center' }}>Total Recibida (NI)</th>
                    <th style={{ textStyle: 'center' }}>Saldo Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {(saldoReq.detalles || saldoReq.requerimiento_detalles || []).map((d, idx) => {
                    const prodObj = d.producto || productosList.find((p) => p.id === d.producto_id) || {};
                    const sol = Number(d.cantidad_solicitada || 0);
                    const rec = Number(d.cantidad_recibida !== undefined ? d.cantidad_recibida : (d.cantidad_solicitada * 0.8));
                    const pend = Number(d.cantidad_pendiente !== undefined ? d.cantidad_pendiente : (sol - rec));

                    return (
                      <tr key={idx}>
                        <td><strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>{prodObj.sku || 'SKU'}</strong></td>
                        <td style={{ fontWeight: '600' }}>{prodObj.nombre || 'Producto'}</td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{sol} u.</td>
                        <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: '700' }}>{rec} u.</td>
                        <td style={{ textAlign: 'center' }}>
                          {pend > 0 ? (
                            <strong style={{ color: '#dc2626', background: '#fef2f2', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                              {pend} u. Faltantes
                            </strong>
                          ) : (
                            <span style={{ color: '#16a34a', fontWeight: '700' }}>✓ Completo</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  alert('El requerimiento se mantendrá en estado PARCIAL a la espera de que el almacén registre la entrega del lote complementario.');
                  setShowSaldoModal(false);
                }}
                style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#93c5fd' }}
              >
                <Clock size={16} /> [Esperar / Emitir Complementaria]
              </button>
              
              <button
                type="button"
                className="primary-btn"
                onClick={() => handleCerrarFaltante(saldoReq.id)}
                style={{ background: '#dc2626', borderColor: '#b91c1c' }}
              >
                <XCircle size={16} /> [Cerrar / Cancelar Faltante]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
