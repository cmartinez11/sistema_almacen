import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, XCircle, Clock, X, Check, Trash2, Warehouse, UserCheck, Eye, FileDown, ShoppingCart, Truck } from 'lucide-react';
import { normalizeRole, ROLES, canViewFinancials, useRole } from '../../config/rbacConfig';
import api from '../../services/api';
import '../pagesCommon.css';

export default function RequerimientosPage() {
  const { user, role, canViewPrices: userCanViewPrices } = useRole();

  const [requerimientos, setRequerimientos] = useState([]);
  const [proveedoresList, setProveedoresList] = useState([]);
  const [personalList, setPersonalList] = useState([]);
  const [productosList, setProductosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bandeja');
  
  // Estado para pre-requerimientos de área
  const [preRequerimientos, setPreRequerimientos] = useState([]);
  const [loadingPreReqs, setLoadingPreReqs] = useState(false);
  
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

  // Modal de Re-cotización de Saldos Pendientes (Nuevo Proveedor / Complementaria)
  const [showRecotizarModal, setShowRecotizarModal] = useState(false);
  const [recotizarReq, setRecotizarReq] = useState(null);
  const [recotizarProveedorId, setRecotizarProveedorId] = useState('');
  const [recotizarDetalles, setRecotizarDetalles] = useState([]);

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

      // Cargar pre-requerimientos del módulo e-commerce
      loadPreRequerimientos();
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
    const selectedIds = new Set(detalles.map((d) => String(d.producto_id)).filter(Boolean));
    const nextProd = productosList.find((p) => !selectedIds.has(String(p.id)));
    if (!nextProd) return;

    setDetalles([
      ...detalles,
      { producto_id: nextProd.id, cantidad_solicitada: 1 },
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

    // Validación de seguridad: verificar que no haya productos vacíos ni duplicados
    const prodIds = detalles.map((d) => String(d.producto_id)).filter(Boolean);
    const uniqueIds = new Set(prodIds);

    if (detalles.some((d) => !d.producto_id)) {
      alert('Por favor seleccione un producto para cada fila agregada.');
      return;
    }

    if (uniqueIds.size !== prodIds.length) {
      alert('No se pueden repetir productos en la misma solicitud. Por favor verifique las filas duplicadas.');
      return;
    }

    try {
      const ahora = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const fechaActualSistema = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;

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
    const items = (req.detalles || req.requerimiento_detalles || []).map((d) => {
      const prodInList = productosList.find((p) => p.id === d.producto_id);
      const ultimoPrecio = Number(
        d.producto?.ultimo_precio_compra ??
        prodInList?.ultimo_precio_compra ??
        d.producto?.costo_unitario ??
        prodInList?.costo_unitario ??
        0
      );
      return {
        id: d.id,
        producto_id: d.producto_id,
        producto_nombre: d.producto?.nombre || prodInList?.nombre || 'Producto',
        producto_sku: d.producto?.sku || prodInList?.sku || 'SKU',
        cantidad_solicitada: d.cantidad_solicitada || 1,
        costo_unitario: Number(d.costo_unitario || ultimoPrecio || 0),
        ultimo_precio_compra: ultimoPrecio,
      };
    });
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

  const handleOpenRecotizarModal = (req) => {
    setRecotizarReq(req);
    setRecotizarProveedorId(req.proveedor_id || proveedoresList[0]?.id || '');
    const items = (req.detalles || req.requerimiento_detalles || [])
      .map((d) => {
        const prodInList = productosList.find((p) => p.id === d.producto_id);
        const sol = Number(d.cantidad_solicitada || 0);
        const rec = Number(d.cantidad_recibida !== undefined ? d.cantidad_recibida : 0);
        const pend = Number(d.cantidad_pendiente !== undefined ? d.cantidad_pendiente : Math.max(0, sol - rec));
        const ultimoPrecio = Number(
          d.producto?.ultimo_precio_compra ??
          prodInList?.ultimo_precio_compra ??
          d.producto?.costo_unitario ??
          prodInList?.costo_unitario ??
          0
        );
        return {
          id: d.id,
          producto_id: d.producto_id,
          producto_nombre: d.producto?.nombre || prodInList?.nombre || 'Producto',
          producto_sku: d.producto?.sku || prodInList?.sku || 'SKU',
          cantidad_solicitada: pend > 0 ? pend : sol,
          cantidad_recibida: rec,
          cantidad_pendiente: pend,
          costo_unitario: Number(d.costo_unitario || ultimoPrecio || 0),
          ultimo_precio_compra: ultimoPrecio,
        };
      })
      .filter((item) => item.cantidad_pendiente > 0);

    setRecotizarDetalles(items);
    setShowRecotizarModal(true);
  };

  const handleRecotizarChange = (index, field, value) => {
    const updated = [...recotizarDetalles];
    updated[index][field] = value;
    setRecotizarDetalles(updated);
  };

  const handleRemoveRecotizarRow = (index) => {
    setRecotizarDetalles((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateRecotizacionTotal = () => {
    return recotizarDetalles.reduce(
      (sum, item) => sum + Number(item.cantidad_solicitada) * Number(item.costo_unitario),
      0
    );
  };

  const handleSubmitRecotizacion = async (e) => {
    e.preventDefault();
    if (recotizarDetalles.length === 0) {
      alert('Debe conservar al menos un ítem para emitir la Orden de Compra Complementaria.');
      return;
    }
    try {
      const payload = {
        proveedor_id: recotizarProveedorId,
        detalles: recotizarDetalles.map((d) => ({
          producto_id: d.producto_id,
          cantidad_solicitada: Number(d.cantidad_solicitada),
          costo_unitario: Number(d.costo_unitario),
        })),
      };

      await api.put(`/requerimientos/${recotizarReq.id}/recotizar-saldo`, payload);
      setShowRecotizarModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al emitir la Orden de Compra Complementaria.');
    }
  };

  const handleAnularSaldo = async (id) => {
    if (!window.confirm('¿Está seguro de anular el saldo pendiente de este requerimiento? El estado pasará a PARCIAL ANULADO y se registrará en el historial de la bandeja general para mantener la trazabilidad.')) {
      return;
    }
    try {
      await api.put(`/requerimientos/${id}/anular-saldo`);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al anular el saldo pendiente.');
    }
  };

  const handleCerrarFaltante = async (id) => {
    return handleAnularSaldo(id);
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

  const loadPreRequerimientos = async () => {
    try {
      setLoadingPreReqs(true);
      const res = await api.get('/pre-requerimientos');
      if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
        setPreRequerimientos(res.data.data);
      }
    } catch (err) {
      console.warn('Error al cargar pre-requerimientos:', err);
    } finally {
      setLoadingPreReqs(false);
    }
  };

  const handleDespacharPreReq = async (preReq) => {
    if (!window.confirm(`¿Confirmas el despacho inmediato de la solicitud ${preReq.correlativo} para el área de ${preReq.area || 'General'}?\n\nSe generará automáticamente la Nota de Salida y se rebajará el stock físico del almacén.`)) {
      return;
    }
    try {
      const res = await api.post(`/pre-requerimientos/${preReq.id}/procesar-salida`);
      if (res.data?.status === 'success') {
        alert(res.data.message || 'Despacho generado exitosamente.');
        loadData();
        loadPreRequerimientos();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error al procesar la salida física.');
    }
  };

  const handlePasarCotizacionPreReq = async (preReq) => {
    const motivo = window.prompt(`¿Deseas derivar la solicitud ${preReq.correlativo} a Cotización y Compras? Ingresa el motivo:`, 'Falta de existencias en almacén');
    if (motivo === null) return;
    try {
      const res = await api.put(`/pre-requerimientos/${preReq.id}/pasar-cotizacion`, { motivo });
      if (res.data?.status === 'success') {
        alert(res.data.message || 'Solicitud derivada a Compras.');
        loadData();
        loadPreRequerimientos();
      }
    } catch (err) {
      console.error(err);
      alert('Error al derivar a cotización.');
    }
  };

  const handleRechazarPreReq = async (preReq) => {
    const motivo = window.prompt(`Motivo de rechazo para ${preReq.correlativo}:`, 'Requerimiento no procedente');
    if (motivo === null) return;
    try {
      const res = await api.put(`/pre-requerimientos/${preReq.id}/rechazar`, { motivo });
      if (res.data?.status === 'success') {
        alert(res.data.message || 'Pre-requerimiento rechazado.');
        loadData();
        loadPreRequerimientos();
      }
    } catch (err) {
      console.error(err);
      alert('Error al rechazar.');
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

      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('prereqs')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderBottom: activeTab === 'prereqs' ? '3px solid #059669' : '3px solid transparent',
            color: activeTab === 'prereqs' ? '#059669' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          🛍️ Pre-requerimientos de Áreas (E-commerce)
          {preRequerimientos.length > 0 && (
            <span style={{ background: '#059669', color: '#fff', borderRadius: '12px', padding: '1px 8px', fontSize: '11px', fontWeight: '800' }}>
              {preRequerimientos.length}
            </span>
          )}
        </button>
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
      </div>

      <div className="table-card">
        {activeTab === 'prereqs' ? (
          loadingPreReqs ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando solicitudes de área...</div>
          ) : preRequerimientos.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No hay pre-requerimientos pendientes en este momento.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código Pre-Req</th>
                  <th>Área Solicitante</th>
                  <th>Responsable</th>
                  <th>Fecha Solicitud</th>
                  <th>Prioridad</th>
                  <th>Disponibilidad Stock</th>
                  <th>Ítems Solicitados</th>
                  <th>Acciones Almacén / Compras</th>
                </tr>
              </thead>
              <tbody>
                {preRequerimientos.map((pr) => {
                  const totalItems = pr.detalles?.length || 0;
                  return (
                    <tr key={pr.id}>
                      <td>
                        <strong style={{ color: '#0284c7', fontFamily: 'monospace', fontSize: '14px' }}>
                          {pr.correlativo}
                        </strong>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontWeight: '700' }}>
                          🏢 {pr.area || 'General'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>
                          {pr.personal ? `${pr.personal.nombres} ${pr.personal.apellidos}` : 'Encargado de Área'}
                        </strong>
                      </td>
                      <td>{new Date(pr.fecha_solicitud || pr.created_at).toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${pr.prioridad === 'alta' ? 'danger' : pr.prioridad === 'media' ? 'warning' : 'success'}`}>
                          {pr.prioridad}
                        </span>
                      </td>
                      <td>
                        {pr.disponibilidad_completa ? (
                          <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '12px', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                            ✓ 100% Stock Físico
                          </span>
                        ) : (
                          <span style={{ color: '#d97706', fontWeight: '700', fontSize: '12px', background: '#fffbeb', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                            ⚠️ Stock Insuficiente (Comprar)
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className="secondary-btn"
                          onClick={() => handleOpenItemsModal(pr)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          <Eye size={13} /> {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            className="primary-btn"
                            onClick={() => handleDespacharPreReq(pr)}
                            style={{ padding: '5px 9px', fontSize: '12px', background: '#059669', borderColor: '#059669' }}
                            title="Despachar inmediatamente generando Nota de Salida física"
                          >
                            <CheckCircle2 size={13} /> Despachar Salida
                          </button>
                          <button
                            className="primary-btn"
                            onClick={() => handlePasarCotizacionPreReq(pr)}
                            style={{ padding: '5px 9px', fontSize: '12px', background: '#0284c7', borderColor: '#0284c7' }}
                            title="Derivar a Compras para Cotización con proveedores"
                          >
                            <ShoppingCart size={13} /> A Cotización
                          </button>
                          <button
                            className="secondary-btn"
                            onClick={() => handleRechazarPreReq(pr)}
                            style={{ padding: '5px 8px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                            title="Rechazar solicitud"
                          >
                            <XCircle size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : loading ? (
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
                        {activeTab === 'saldos' ? (
                          <button
                            className="secondary-btn"
                            onClick={() => handleOpenItemsModal(req)}
                            style={{ padding: '5px 12px', fontSize: '12.5px', background: '#fefce8', color: '#854d0e', borderColor: '#fef08a' }}
                          >
                            <Eye size={14} /> Ver remanente [{
                              (req.detalles || req.requerimiento_detalles || []).filter(
                                (d) => Number(d.cantidad_pendiente !== undefined ? d.cantidad_pendiente : (Number(d.cantidad_solicitada) - Number(d.cantidad_recibida || 0))) > 0
                              ).length
                            }] ítems
                          </button>
                        ) : (
                          <button
                            className="secondary-btn"
                            onClick={() => handleOpenItemsModal(req)}
                            style={{ padding: '5px 12px', fontSize: '12.5px', background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}
                          >
                            <Eye size={14} /> Ver [{totalItemsCount}] ítems
                          </button>
                        )}
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
                        {req.estado === 'parcial_anulado' && (
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                            <XCircle size={12} /> PARCIAL ANULADO
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

                          {/* 3. ESTADO PARCIAL: Botones [Re-cotizar / Nuevo Proveedor] y [Anular Saldo] */}
                          {req.estado === 'parcial' && (
                            <>
                              {(role === ROLES.COMPRAS || role === ROLES.ADMINISTRADOR) && (
                                <>
                                  <button
                                    className="primary-btn"
                                    onClick={() => handleOpenRecotizarModal(req)}
                                    style={{ padding: '5px 10px', fontSize: '12px', background: '#2563eb', borderColor: '#2563eb' }}
                                    title="Re-cotizar saldo pendiente con nuevo proveedor"
                                  >
                                    <ShoppingCart size={14} /> Re-cotizar / Nuevo Proveedor
                                  </button>
                                  <button
                                    className="secondary-btn"
                                    onClick={() => handleAnularSaldo(req.id)}
                                    style={{ padding: '5px 10px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                                    title="Anular saldo faltante si ya no se va a adquirir"
                                  >
                                    <XCircle size={14} /> Anular Saldo
                                  </button>
                                </>
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
                  {(() => {
                    const selectedProductIds = new Set(detalles.map((d) => String(d.producto_id)).filter(Boolean));
                    const hasAvailableProducts = productosList.length > 0 && productosList.some((p) => !selectedProductIds.has(String(p.id)));

                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Productos a Solicitar (Solo Cantidades)</h4>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={handleAddRow}
                            disabled={!hasAvailableProducts}
                            style={{
                              padding: '4px 10px',
                              fontSize: '12.5px',
                              opacity: !hasAvailableProducts ? 0.5 : 1,
                              cursor: !hasAvailableProducts ? 'not-allowed' : 'pointer',
                            }}
                            title={!hasAvailableProducts ? 'Todos los productos del catálogo ya han sido añadidos' : 'Añadir Producto'}
                          >
                            <Plus size={14} /> Añadir Producto
                          </button>
                        </div>

                        {detalles.map((row, idx) => {
                          const otherSelectedIds = new Set(
                            detalles
                              .filter((_, i) => i !== idx)
                              .map((d) => String(d.producto_id))
                              .filter(Boolean)
                          );

                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 140px 40px',
                                gap: '12px',
                                alignItems: 'end',
                                marginBottom: '10px',
                                background: '#f8fafc',
                                padding: '12px 14px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                boxSizing: 'border-box',
                              }}
                            >
                              <div>
                                <label
                                  style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#64748b',
                                    marginBottom: '6px',
                                  }}
                                >
                                  Producto Requerido
                                </label>
                                <select
                                  required
                                  value={row.producto_id}
                                  onChange={(e) => handleItemChange(idx, 'producto_id', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '38px',
                                    padding: '6px 10px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '13.5px',
                                    background: '#ffffff',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  <option value="">-- Seleccionar Producto --</option>
                                  {productosList.map((prod) => {
                                    const isSelectedElsewhere = otherSelectedIds.has(String(prod.id));
                                    const skuVal = prod.sku || prod.codigo_sku || `PROD-${prod.id}`;
                                    const nomVal = prod.nombre || prod.nombre_producto || 'Producto Sin Nombre';
                                    return (
                                      <option
                                        key={prod.id}
                                        value={prod.id}
                                        disabled={isSelectedElsewhere}
                                      >
                                        {skuVal} - {nomVal}{isSelectedElsewhere ? ' (Ya seleccionado)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              <div>
                                <label
                                  style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#64748b',
                                    marginBottom: '6px',
                                  }}
                                >
                                  Cant. Solicitada
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={row.cantidad_solicitada}
                                  onChange={(e) => handleItemChange(idx, 'cantidad_solicitada', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '38px',
                                    padding: '6px 10px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '13.5px',
                                    background: '#ffffff',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                title="Eliminar producto"
                                style={{
                                  height: '38px',
                                  width: '38px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  borderRadius: '6px',
                                  transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
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
          <div className="modal-card" style={{ maxWidth: '860px' }}>
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
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.8fr 0.9fr 1.6fr 1.1fr', gap: '12px', alignItems: 'center', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Costo Unit. (S/)</label>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#0284c7',
                              background: '#e0f2fe',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                            title="Último precio de compra registrado en notas de ingreso"
                          >
                            Últ. Compra: S/ {Number(row.ultimo_precio_compra || 0).toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="0.00"
                          value={row.costo_unitario}
                          onChange={(e) => handleCotizarChange(idx, 'costo_unitario', e.target.value)}
                        />
                        {Number(row.ultimo_precio_compra) > 0 && (
                          <button
                            type="button"
                            onClick={() => handleCotizarChange(idx, 'costo_unitario', Number(row.ultimo_precio_compra).toFixed(2))}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '3px 0 0 0',
                              fontSize: '11.5px',
                              color: '#2563eb',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              fontWeight: '500',
                              display: 'inline-block',
                            }}
                            title="Copiar último precio de compra registrado"
                          >
                            ⚡ Usar último precio
                          </button>
                        )}
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b' }}>Total x Prod.</label>
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
          <div className="modal-card" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>
                  {activeTab === 'saldos' || selectedReq.estado === 'parcial'
                    ? 'Detalle de Remanente Pendiente por Recibir'
                    : 'Detalle de Ítems Solicitados'}
                </h3>
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

              <h4 style={{ margin: '12px 0 8px 0', fontSize: '14px', color: '#0f172a' }}>
                {activeTab === 'saldos' ? 'Productos con Remanente Pendiente:' : 'Lista de Productos:'}
              </h4>

              <table className="data-table">
                <thead>
                  {activeTab === 'saldos' ? (
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th style={{ textAlign: 'center' }}>Cant. Original</th>
                      <th style={{ textAlign: 'center' }}>Total Recibida</th>
                      <th style={{ textAlign: 'center' }}>Remanente Pendiente</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Cant. Solicitada</th>
                      <th>Costo Unit. (S/)</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {(selectedReq.detalles || selectedReq.requerimiento_detalles || [])
                    .filter((d) => {
                      if (activeTab === 'saldos') {
                        const sol = Number(d.cantidad_solicitada || 0);
                        const rec = Number(d.cantidad_recibida !== undefined ? d.cantidad_recibida : 0);
                        const pend = Number(d.cantidad_pendiente !== undefined ? d.cantidad_pendiente : Math.max(0, sol - rec));
                        return pend > 0;
                      }
                      return true;
                    })
                    .map((d, index) => {
                      const prodObj = d.producto || productosList.find((p) => p.id === d.producto_id) || {};
                      const sol = Number(d.cantidad_solicitada || 0);
                      const rec = Number(d.cantidad_recibida !== undefined ? d.cantidad_recibida : 0);
                      const pend = Number(d.cantidad_pendiente !== undefined ? d.cantidad_pendiente : Math.max(0, sol - rec));

                      if (activeTab === 'saldos') {
                        return (
                          <tr key={index}>
                            <td><strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>{prodObj.sku || 'SKU'}</strong></td>
                            <td style={{ fontWeight: '600' }}>{prodObj.nombre || 'Producto General'}</td>
                            <td style={{ textAlign: 'center', fontWeight: '600' }}>{sol} u.</td>
                            <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: '700' }}>{rec} u.</td>
                            <td style={{ textAlign: 'center' }}>
                              <strong style={{ color: '#dc2626', background: '#fef2f2', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                                {pend} u. Pendientes
                              </strong>
                            </td>
                          </tr>
                        );
                      }

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
                            {userCanViewPrices && d.costo_unitario !== null ? (
                              <strong>S/ {Number(d.costo_unitario || 0).toFixed(2)}</strong>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
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

      {/* MODAL 4: RE-COTIZAR SALDO PENDIENTE (NUEVO PROVEEDOR / OC COMPLEMENTARIA) */}
      {showRecotizarModal && recotizarReq && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '860px' }}>
            <div className="modal-header" style={{ background: '#fefce8', borderBottom: '1px solid #fef08a' }}>
              <div>
                <h3 style={{ margin: 0, color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={20} /> Re-cotizar Saldo Pendiente & Emitir OC Complementaria
                </h3>
                <span style={{ fontSize: '12px', color: '#a16207', fontWeight: '700', fontFamily: 'monospace' }}>
                  Saldo Faltante de: {recotizarReq.correlativo}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowRecotizarModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmitRecotizacion}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
                  ℹ️ Este formulario contiene <strong>únicamente el saldo remanente pendiente</strong> de la orden {recotizarReq.correlativo}. Puede seleccionar un nuevo proveedor, actualizar precios unitarios y emitir una nueva Orden de Compra Complementaria (estado PEDIDO).
                </div>

                <div className="form-group" style={{ background: '#ffffff', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '10px' }}>
                  <label style={{ fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={16} color="#2563eb" /> Seleccionar Proveedor Ganador / Cotizado
                  </label>
                  <select
                    required
                    value={recotizarProveedorId}
                    onChange={(e) => setRecotizarProveedorId(e.target.value)}
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
                  Ítems con Saldo Pendiente a Re-cotizar:
                </h4>

                {recotizarDetalles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', background: '#fff1f2', border: '1px dashed #f43f5e', borderRadius: '8px', color: '#9f1239' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700' }}>
                      ⚠️ Se han quitado todos los ítems de la re-cotización
                    </p>
                    <p style={{ margin: '0 0 14px 0', fontSize: '12.5px', color: '#881337' }}>
                      Si ya no se va a requerir la compra de estos materiales restantes, puede anular directamente el saldo pendiente de este requerimiento.
                    </p>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        setShowRecotizarModal(false);
                        handleAnularSaldo(recotizarReq.id);
                      }}
                      style={{ background: '#ffffff', color: '#e11d48', borderColor: '#fecdd3', fontWeight: '600', padding: '6px 14px', fontSize: '13px' }}
                    >
                      <XCircle size={15} /> Anular Saldo Pendiente Ahora
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recotizarDetalles.map((row, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.8fr 0.9fr 1.6fr 1fr 38px', gap: '12px', alignItems: 'center', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <strong style={{ fontSize: '12px', color: '#2563eb', fontFamily: 'monospace', display: 'block' }}>
                            {row.producto_sku}
                          </strong>
                          <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#0f172a' }}>
                            {row.producto_nombre}
                          </span>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#b45309', fontWeight: '700' }}>Saldo Pendiente</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={row.cantidad_solicitada}
                            onChange={(e) => handleRecotizarChange(idx, 'cantidad_solicitada', e.target.value)}
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Costo Unit. (S/)</label>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#0284c7',
                                background: '#e0f2fe',
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                              title="Último precio de compra registrado en notas de ingreso"
                            >
                              Últ. Compra: S/ {Number(row.ultimo_precio_compra || 0).toFixed(2)}
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="0.00"
                            value={row.costo_unitario}
                            onChange={(e) => handleRecotizarChange(idx, 'costo_unitario', e.target.value)}
                          />
                          {Number(row.ultimo_precio_compra) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRecotizarChange(idx, 'costo_unitario', Number(row.ultimo_precio_compra).toFixed(2))}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: '3px 0 0 0',
                                fontSize: '11.5px',
                                color: '#2563eb',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                fontWeight: '500',
                                display: 'inline-block',
                              }}
                              title="Copiar último precio de compra registrado"
                            >
                              ⚡ Usar último precio
                            </button>
                          )}
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#64748b' }}>Total x Prod.</label>
                          <strong style={{ display: 'block', padding: '8px', background: '#ffffff', borderRadius: '6px', fontSize: '13px', color: '#16a34a' }}>
                            S/ {(Number(row.cantidad_solicitada) * Number(row.costo_unitario)).toFixed(2)}
                          </strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecotizarRow(idx)}
                            style={{
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#e11d48',
                              borderRadius: '6px',
                              padding: '7px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Quitar este ítem de la re-cotización"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ textAlign: 'right', marginTop: '16px', padding: '12px', background: '#fefce8', borderRadius: '8px', border: '1px solid #fef08a' }}>
                  <span style={{ fontSize: '13px', color: '#854d0e', fontWeight: '600' }}>VALOR TOTAL OC COMPLEMENTARIA: </span>
                  <strong style={{ color: '#a16207', fontSize: '20px', marginLeft: '8px' }}>
                    S/ {calculateRecotizacionTotal().toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowRecotizarModal(false)}>Cancelar</button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={recotizarDetalles.length === 0}
                  style={{
                    background: recotizarDetalles.length === 0 ? '#94a3b8' : '#2563eb',
                    borderColor: recotizarDetalles.length === 0 ? '#94a3b8' : '#2563eb',
                    cursor: recotizarDetalles.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Check size={16} /> Emitir Orden Complementaria (PEDIDO)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
