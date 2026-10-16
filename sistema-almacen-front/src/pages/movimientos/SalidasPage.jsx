import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowUpRight, UserCheck, Eye, X, Check, Trash2, Search, AlertCircle, FileText, Building2, Tag, Package, ShoppingCart, Minus } from 'lucide-react';
import api from '../../services/api';
import { obtenerImagenProducto, handleProductImageError } from '../../utils/productImages';
import '../pagesCommon.css';

export default function SalidasPage() {
  const [salidas, setSalidas] = useState([]);
  const [personalList, setPersonalList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);
  const [productosList, setProductosList] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados para buscador interactivo de trabajador
  const [workerSearch, setWorkerSearch] = useState('');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const workerDropdownRef = useRef(null);

  // Estados para modal secundario de catálogo e-commerce
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [tempDetalles, setTempDetalles] = useState([]);

  // Formulario cabecera
  const [formHeader, setFormHeader] = useState({
    almacen_id: 1,
    personal_id: '',
    area_trabajador: '',
    area_destino: '',
    justificacion: '',
    observaciones: '',
  });

  // Ítems dinámicos
  const [detalles, setDetalles] = useState([
    { producto_id: '', cantidad: 1, stock_disponible: 0 },
  ]);

  const mockSalidas = [
    {
      id: 1,
      correlativo: 'NS-2026-0045',
      fecha_emision: '2026-10-06',
      almacen: { nombre: 'Almacén Principal' },
      personal: { nombres: 'Juan', apellidos: 'Pérez Ramos', dni: '45892104', area: 'Operaciones' },
      area_trabajador: 'Operaciones',
      area_destino: 'Mantenimiento Eléctrico',
      justificacion: 'Reparación de tablero eléctrico en nave B - OT #881',
      tipo_salida: 'Asignación a Personal',
      estado: 'emitido',
      salidas_detalle: [{}, {}, {}],
    },
    {
      id: 2,
      correlativo: 'NS-2026-0044',
      fecha_emision: '2026-10-05',
      almacen: { nombre: 'Planta 3' },
      personal: { nombres: 'Maria', apellidos: 'Gómez Salcedo', dni: '70192384', area: 'Comercial' },
      area_trabajador: 'Comercial',
      area_destino: 'Telecomunicaciones',
      justificacion: 'Instalación de cables para router piso 2',
      tipo_salida: 'Asignación a Personal',
      estado: 'emitido',
      salidas_detalle: [{}, {}],
    },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  // Cerrar dropdown flotante al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (workerDropdownRef.current && !workerDropdownRef.current.contains(event.target)) {
        setShowWorkerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStockForWarehouse = (prod, almacenId) => {
    if (!prod) return 0;
    if (Array.isArray(prod.almacenes)) {
      const alm = prod.almacenes.find((a) => String(a.id) === String(almacenId));
      if (alm && alm.pivot) {
        return Number(alm.pivot.stock || 0);
      }
    }
    return Number(prod.stock_actual || 0);
  };

  // Helper compartido de imágenes de producto
  const getProductImage = obtenerImagenProducto;

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [resSal, resPers, resProd, resAlm, resUsers] = await Promise.all([
        api.get('/salidas'),
        api.get('/personal'),
        api.get('/productos'),
        api.get('/almacenes'),
        api.get('/usuarios').catch(() => ({ data: [] })),
      ]);

      const dataSal = resSal.data?.data?.data || resSal.data?.data || resSal.data;
      setSalidas(Array.isArray(dataSal) && dataSal.length > 0 ? dataSal : mockSalidas);

      const dataPers = resPers.data?.data || resPers.data;
      setPersonalList(Array.isArray(dataPers) ? dataPers : []);

      const dataProd = resProd.data?.data?.data || resProd.data?.data || resProd.data;
      setProductosList(Array.isArray(dataProd) ? dataProd : []);

      const dataAlm = resAlm.data?.data || resAlm.data;
      const listAlm = Array.isArray(dataAlm) && dataAlm.length > 0 ? dataAlm : [
        { id: 1, nombre: 'Almacén Principal', codigo: 'ALM-01' },
        { id: 2, nombre: 'Planta 3', codigo: 'ALM-03' }
      ];
      setAlmacenes(listAlm);

      const dataUsers = resUsers.data?.data || resUsers.data || [];
      setUsuariosList(Array.isArray(dataUsers) ? dataUsers : []);
    } catch (err) {
      console.warn('Usando datos de respaldo para Salidas:', err);
      setSalidas(mockSalidas);
      setAlmacenes([
        { id: 1, nombre: 'Almacén Principal', codigo: 'ALM-01' },
        { id: 2, nombre: 'Planta 3', codigo: 'ALM-03' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de trabajadores en tiempo real por DNI, Nombres, Apellidos o Cargo
  const filteredPersonal = personalList.filter((p) => {
    if (!workerSearch.trim()) return true;
    const term = workerSearch.toLowerCase().trim();
    const fullName = `${p.nombres || ''} ${p.apellidos || ''}`.toLowerCase();
    const reverseName = `${p.apellidos || ''} ${p.nombres || ''}`.toLowerCase();
    const dni = String(p.dni || p.documento_identidad || '').toLowerCase();
    const area = String(p.area || '').toLowerCase();
    const cargo = String(p.cargo || '').toLowerCase();
    return fullName.includes(term) || reverseName.includes(term) || dni.includes(term) || area.includes(term) || cargo.includes(term);
  });

  // Trabajador actualmente seleccionado
  const selectedWorker = personalList.find((p) => String(p.id) === String(formHeader.personal_id));

  // Catálogo base de áreas corporativas estándar
  const baseStandardAreas = [
    'Administración',
    'Almacén / Logística',
    'Comercial',
    'Compras',
    'Contabilidad',
    'Control de Calidad',
    'Despacho',
    'Extrusión',
    'Gerencia General',
    'Laminado',
    'Mantenimiento',
    'Operaciones / Planta',
    'Recursos Humanos (RRHH)',
    'Sellado',
    'Sistemas',
    'Termoformado',
  ];

  // Lista estricta y consolidada de áreas oficiales (sin duplicados, normalizadas y ordenadas)
  const areasList = Array.from(
    new Set([
      ...personalList.map((p) => (p.area ? p.area.trim() : null)).filter(Boolean),
      ...usuariosList.map((u) => (u.area ? u.area.trim() : null)).filter(Boolean),
      ...baseStandardAreas,
    ])
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  // Catálogo de categorías
  const catalogCategories = Array.from(
    new Set(productosList.map((p) => p.categoria?.nombre).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'es'));

  // Filtro dinámico de productos en el sub-modal de catálogo e-commerce
  const filteredCatalogProducts = productosList.filter((prod) => {
    const matchesCategory =
      catalogCategory === 'all' || prod.categoria?.nombre === catalogCategory;
    if (!matchesCategory) return false;

    if (!catalogSearch.trim()) return true;
    const term = catalogSearch.toLowerCase().trim();
    const sku = (prod.sku || '').toLowerCase();
    const nombre = (prod.nombre || '').toLowerCase();
    const cat = (prod.categoria?.nombre || '').toLowerCase();
    return sku.includes(term) || nombre.includes(term) || cat.includes(term);
  });

  const handleOpenModal = () => {
    setErrorMsg('');
    const defaultAlm = almacenes[0]?.id || 1;

    setFormHeader({
      almacen_id: defaultAlm,
      personal_id: '',
      area_trabajador: '',
      area_destino: '',
      justificacion: '',
      observaciones: '',
    });
    setWorkerSearch('');
    setShowWorkerDropdown(false);
    setDetalles([]);
    setShowModal(true);
  };

  const handleOpenCatalog = () => {
    setTempDetalles([...detalles]);
    setCatalogSearch('');
    setCatalogCategory('all');
    setShowCatalogModal(true);
  };

  const handleCatalogAdd = (prod, initialQty = 1) => {
    const stockAvailable = getStockForWarehouse(prod, formHeader.almacen_id);
    if (stockAvailable <= 0) return;
    const validQty = Math.min(initialQty, stockAvailable);

    setTempDetalles((prev) => {
      const exists = prev.find((d) => String(d.producto_id) === String(prod.id));
      if (exists) {
        return prev.map((d) =>
          String(d.producto_id) === String(prod.id)
            ? { ...d, cantidad: Math.min(d.cantidad + 1, stockAvailable) }
            : d
        );
      }
      return [
        ...prev,
        {
          producto_id: prod.id,
          cantidad: validQty,
          stock_disponible: stockAvailable,
        },
      ];
    });
  };

  const handleCatalogChangeQty = (prodId, delta, maxStock) => {
    setTempDetalles((prev) =>
      prev
        .map((d) => {
          if (String(d.producto_id) === String(prodId)) {
            const nextQty = d.cantidad + delta;
            if (nextQty <= 0) return null;
            return { ...d, cantidad: Math.min(nextQty, maxStock) };
          }
          return d;
        })
        .filter(Boolean)
    );
  };

  const handleCatalogSetQty = (prodId, newQty, maxStock) => {
    if (newQty <= 0) {
      setTempDetalles((prev) => prev.filter((d) => String(d.producto_id) !== String(prodId)));
      return;
    }
    const safeQty = Math.min(newQty, maxStock);
    setTempDetalles((prev) =>
      prev.map((d) =>
        String(d.producto_id) === String(prodId)
          ? { ...d, cantidad: safeQty }
          : d
      )
    );
  };

  const handleConfirmCatalogSelection = () => {
    setDetalles(
      tempDetalles.map((d) => {
        const prod = productosList.find((p) => String(p.id) === String(d.producto_id));
        return {
          ...d,
          stock_disponible: getStockForWarehouse(prod, formHeader.almacen_id),
        };
      })
    );
    setShowCatalogModal(false);
  };

  const handleUpdateDetalleQty = (prodId, newQty) => {
    const prod = productosList.find((p) => String(p.id) === String(prodId));
    const stock = getStockForWarehouse(prod, formHeader.almacen_id);
    const safeQty = Math.max(1, Math.min(newQty || 1, stock > 0 ? stock : 1));

    setDetalles((prev) =>
      prev.map((d) =>
        String(d.producto_id) === String(prodId)
          ? { ...d, cantidad: safeQty }
          : d
      )
    );
  };

  const handleRemoveDetalle = (prodId) => {
    setDetalles((prev) => prev.filter((d) => String(d.producto_id) !== String(prodId)));
  };

  const handleSelectWorker = (worker) => {
    const rawArea = worker.area ? worker.area.trim() : 'General';
    // Buscar coincidencia exacta o por mayúsculas/minúsculas en el catálogo oficial
    const matchedArea = areasList.find((a) => a.toLowerCase() === rawArea.toLowerCase()) || rawArea;

    setFormHeader((prev) => ({
      ...prev,
      personal_id: worker.id,
      area_trabajador: rawArea,
      // Preseleccionar automáticamente el área base en el selector estricto de Área de Destino
      area_destino: matchedArea,
    }));
    setWorkerSearch(`${worker.apellidos}, ${worker.nombres} (DNI: ${worker.dni || worker.documento_identidad || 'S/N'})`);
    setShowWorkerDropdown(false);
  };

  const handleClearWorker = () => {
    setFormHeader((prev) => ({
      ...prev,
      personal_id: '',
      area_trabajador: '',
      area_destino: '',
    }));
    setWorkerSearch('');
    setShowWorkerDropdown(true);
  };

  const handleAlmacenChange = (almId) => {
    setFormHeader((prev) => ({ ...prev, almacen_id: almId }));
    setDetalles((prevDet) =>
      prevDet.map((d) => {
        const prod = productosList.find((p) => String(p.id) === String(d.producto_id));
        return {
          ...d,
          stock_disponible: getStockForWarehouse(prod, almId),
        };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formHeader.personal_id) {
      setErrorMsg('Debe buscar y seleccionar un trabajador receptante de la lista desplegable.');
      return;
    }

    if (!formHeader.area_destino || !formHeader.area_destino.trim()) {
      setErrorMsg('Debe seleccionar el Área de Destino o Centro de Costo asignado de la lista oficial.');
      return;
    }

    if (detalles.length === 0) {
      setErrorMsg('Debe seleccionar al menos un producto del catálogo para despachar.');
      return;
    }

    if (!formHeader.area_destino || !formHeader.area_destino.trim()) {
      setErrorMsg('Debe seleccionar el Área de Destino o Centro de Costo asignado de la lista oficial.');
      return;
    }

    // Validación previa para no exceder stock del almacén seleccionado
    for (const item of detalles) {
      if (Number(item.cantidad) > Number(item.stock_disponible)) {
        setErrorMsg(`La cantidad solicitada supera el stock disponible (${item.stock_disponible} u.) en el almacén seleccionado.`);
        return;
      }
    }

    try {
      const payload = {
        almacen_id: Number(formHeader.almacen_id || 1),
        personal_id: formHeader.personal_id,
        area_trabajador: formHeader.area_trabajador || selectedWorker?.area || 'General',
        area_destino: formHeader.area_destino.trim(),
        justificacion: formHeader.justificacion ? formHeader.justificacion.trim() : null,
        observaciones: formHeader.justificacion ? formHeader.justificacion.trim() : (formHeader.observaciones || null),
        detalles: detalles.map((d) => ({
          producto_id: d.producto_id,
          cantidad: Number(d.cantidad),
        })),
      };

      await api.post('/salidas', payload);
      setShowModal(false);
      loadInitialData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Error al procesar la salida. Verifique el stock disponible.');
    }
  };

  const handleExportPdf = (sal) => {
    const pdfUrl = `http://127.0.0.1:8000/api/salidas/${sal.id}/pdf`;
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Notas de Salida y Asignación a Personal (NS)</h2>
          <p>Despacho y asignación de materiales con doble trazabilidad de área (Base vs. Destino) y justificación.</p>
        </div>
        <button
          className="primary-btn"
          onClick={handleOpenModal}
          style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' }}
        >
          <Plus size={18} /> Registrar Nueva Salida
        </button>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando notas de salida...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Correlativo</th>
                <th>Fecha Despacho</th>
                <th>Almacén Origen</th>
                <th>Asignado A (Personal)</th>
                <th>DNI Trabajador</th>
                <th>Área Destino (Gasto)</th>
                <th>Área Base</th>
                <th>Justificación / Motivo</th>
                <th>N° Ítems</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {salidas.map((sal) => (
                <tr key={sal.id}>
                  <td>
                    <strong style={{ color: '#ea580c', fontFamily: 'monospace', fontSize: '13.5px' }}>
                      {sal.correlativo || `NS-2026-00${sal.id}`}
                    </strong>
                  </td>
                  <td>{sal.fecha_emision ? String(sal.fecha_emision).split('T')[0] : '2026-10-06'}</td>
                  <td>
                    <span className="badge badge-purple" style={{ fontWeight: '700' }}>
                      🏭 {sal.almacen?.nombre || (sal.almacen_id === 2 ? 'Planta 3' : 'Almacén Principal')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={16} color="#2563eb" />
                      <strong style={{ color: '#0f172a' }}>
                        {sal.personal ? `${sal.personal.nombres} ${sal.personal.apellidos}` : 'Trabajador'}
                      </strong>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: '#475569', fontWeight: '600' }}>
                      {sal.personal?.dni || sal.personal?.documento_identidad || 'S/N'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontWeight: '700' }}>
                      🎯 {sal.area_destino || sal.destino_cliente || 'General'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
                      {sal.area_trabajador || sal.personal?.area || 'General'}
                    </span>
                  </td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sal.justificacion || sal.observaciones || 'Sin justificación'}>
                    <span style={{ fontSize: '12px', color: '#334155' }}>
                      {sal.justificacion || sal.observaciones || '-'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>
                      {sal.salidas_detalle?.length || sal.detalles?.length || 1} productos
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-success">
                      {sal.estado ? sal.estado.toUpperCase() : 'EMITIDO'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="action-btn"
                      title="Descargar / Ver Reporte PDF Nota de Salida"
                      onClick={() => handleExportPdf(sal)}
                      style={{ color: '#ea580c', borderColor: '#fed7aa', background: '#fff7ed' }}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL MULTI-ITEM PARA NUEVA NOTA DE SALIDA CON BÚSQUEDA INTERACTIVA */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '840px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
                  <Plus size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Registrar Nota de Salida / Asignación a Personal</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Despacho y cargo de materiales con control de centros de costo</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
                {errorMsg && (
                  <div style={{ padding: '12px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                {/* FILA 1: ALMACÉN Y BUSCADOR INTERACTIVO DE TRABAJADOR */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: '1' }}>
                    <label style={{ fontWeight: '700', color: '#c2410c' }}>
                      🏭 Almacén Origen (Despacho)
                    </label>
                    <select
                      required
                      value={formHeader.almacen_id}
                      onChange={(e) => handleAlmacenChange(e.target.value)}
                      style={{ borderColor: '#ea580c', fontWeight: '700', background: '#fff7ed' }}
                    >
                      {almacenes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} ({a.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* BUSCADOR CON AUTOCOMPLETADO EN TIEMPO REAL */}
                  <div className="form-group" style={{ flex: '2', position: 'relative' }} ref={workerDropdownRef}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: '700' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck size={14} color="#2563eb" /> Trabajador Receptante (Buscar DNI o Nombre)
                      </span>
                      {formHeader.personal_id && (
                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>✓ Seleccionado</span>
                      )}
                    </label>

                    <div style={{ position: 'relative' }}>
                      <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="text"
                        placeholder="Escriba DNI o Apellidos / Nombres..."
                        value={workerSearch}
                        onChange={(e) => {
                          setWorkerSearch(e.target.value);
                          setShowWorkerDropdown(true);
                          if (formHeader.personal_id) {
                            setFormHeader((prev) => ({ ...prev, personal_id: '' }));
                          }
                        }}
                        onFocus={() => setShowWorkerDropdown(true)}
                        style={{
                          paddingLeft: '34px',
                          paddingRight: workerSearch ? '30px' : '10px',
                          borderColor: formHeader.personal_id ? '#16a34a' : '#cbd5e1',
                          background: formHeader.personal_id ? '#f0fdf4' : '#ffffff',
                          fontWeight: formHeader.personal_id ? '700' : 'normal',
                          fontSize: '13.5px',
                        }}
                      />
                      {workerSearch && (
                        <button
                          type="button"
                          onClick={handleClearWorker}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                          }}
                          title="Limpiar y buscar otro"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    {/* MENÚ DESPLEGABLE FLOTANTE DE RESULTADOS */}
                    {showWorkerDropdown && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 100,
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
                          maxHeight: '220px',
                          overflowY: 'auto',
                          marginTop: '4px',
                        }}
                      >
                        {filteredPersonal.length === 0 ? (
                          <div style={{ padding: '12px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                            No se encontró ningún trabajador con ese DNI o Nombre.
                          </div>
                        ) : (
                          filteredPersonal.map((w) => (
                            <div
                              key={w.id}
                              onClick={() => handleSelectWorker(w)}
                              style={{
                                padding: '8px 12px',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                                background: String(formHeader.personal_id) === String(w.id) ? '#eff6ff' : '#ffffff',
                              }}
                              onMouseEnter={(e) => {
                                if (String(formHeader.personal_id) !== String(w.id)) {
                                  e.currentTarget.style.background = '#fff7ed';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (String(formHeader.personal_id) !== String(w.id)) {
                                  e.currentTarget.style.background = '#ffffff';
                                }
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                                  {w.apellidos}, {w.nombres}
                                </strong>
                                <span style={{ fontFamily: 'monospace', fontSize: '11.5px', fontWeight: '700', color: '#2563eb', background: '#dbeafe', padding: '1px 6px', borderRadius: '4px' }}>
                                  DNI: {w.dni || w.documento_identidad || 'S/N'}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'flex', gap: '12px' }}>
                                <span>Área Base: <strong style={{ color: '#334155' }}>{w.area || 'General'}</strong></span>
                                {w.cargo && <span>• Cargo: {w.cargo}</span>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* TARJETA DE AUDITORÍA DE PERSONAL DEL TRABAJADOR SELECCIONADO */}
                {selectedWorker && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                          {selectedWorker.apellidos}, {selectedWorker.nombres}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <span>DNI: <strong>{selectedWorker.dni || selectedWorker.documento_identidad || 'S/N'}</strong></span>
                          <span>Área Base Oficial: <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', color: '#334155' }}>{formHeader.area_trabajador || selectedWorker.area || 'General'}</span></span>
                          {selectedWorker.cargo && <span>Cargo: <strong>{selectedWorker.cargo}</strong></span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* FILA 2: SEPARACIÓN DE ÁREA DE DESTINO (CENTRO DE COSTO) Y JUSTIFICACIÓN */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: '1.2' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: '700' }}>
                      <span>🎯 Área de Destino / Centro de Costo</span>
                      <span style={{ fontSize: '10.5px', color: '#2563eb', fontWeight: '700' }}>Selector Oficial</span>
                    </label>
                    <select
                      required
                      value={formHeader.area_destino}
                      onChange={(e) => setFormHeader({ ...formHeader, area_destino: e.target.value })}
                      style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        borderColor: '#93c5fd',
                        background: formHeader.area_destino ? '#eff6ff' : '#ffffff',
                        color: formHeader.area_destino ? '#1e40af' : '#0f172a',
                      }}
                    >
                      <option value="">-- Seleccionar Área de Destino --</option>
                      {formHeader.area_destino && !areasList.includes(formHeader.area_destino) && (
                        <option value={formHeader.area_destino}>
                          {formHeader.area_destino} (Área Base del Trabajador)
                        </option>
                      )}
                      {areasList.map((area) => (
                        <option key={area} value={area}>
                          {area} {formHeader.area_trabajador && formHeader.area_trabajador.toLowerCase() === area.toLowerCase() ? '★ (Área Base del Trabajador)' : ''}
                        </option>
                      ))}
                    </select>
                    <small style={{ fontSize: '10.5px', color: '#64748b' }}>
                      Seleccione el centro de costo oficial para imputar el gasto del material despachado.
                    </small>
                  </div>

                  <div className="form-group" style={{ flex: '1.8' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: '700' }}>
                      <span>📋 Justificación / Motivo del Despacho</span>
                      <span style={{ fontSize: '10.5px', color: '#c2410c', fontWeight: '600' }}>Trazabilidad & OT</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Orden de Trabajo #304, mantenimiento de bombas, dotación periódica..."
                      value={formHeader.justificacion}
                      onChange={(e) => setFormHeader({ ...formHeader, justificacion: e.target.value })}
                      style={{ fontSize: '13px' }}
                    />
                    <small style={{ fontSize: '10.5px', color: '#64748b' }}>
                      Detalle el propósito laboral o trabajo asignado que justifica la salida de almacén.
                    </small>
                  </div>
                </div>

                {/* BOTÓN PRINCIPAL DE SELECCIÓN Y RESUMEN DE MATERIALES A DESPACHAR */}
                <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={18} color="#ea580c" /> Materiales / Insumos a Despachar
                      </h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {detalles.length === 0
                          ? 'Abra el catálogo visual con fotos para añadir los productos a entregar.'
                          : `${detalles.length} ${detalles.length === 1 ? 'producto seleccionado' : 'productos seleccionados'} para despacho.`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenCatalog}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 18px',
                        background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(234, 88, 12, 0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.25)';
                      }}
                    >
                      <ShoppingCart size={17} /> 🛒 Seleccionar Materiales del Catálogo (E-commerce)
                      {detalles.length > 0 && (
                        <span style={{ background: '#ffffff', color: '#c2410c', padding: '1px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                          {detalles.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* RESUMEN DE PRODUCTOS SELECCIONADOS */}
                  {detalles.length === 0 ? (
                    <div
                      onClick={handleOpenCatalog}
                      style={{
                        textAlign: 'center',
                        padding: '36px 20px',
                        background: '#fffaf5',
                        border: '2px dashed #fdba74',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fff7ed';
                        e.currentTarget.style.borderColor = '#ea580c';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fffaf5';
                        e.currentTarget.style.borderColor = '#fdba74';
                      }}
                    >
                      <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                        <ShoppingCart size={22} />
                      </div>
                      <div style={{ fontWeight: '700', color: '#c2410c', fontSize: '14.5px' }}>
                        Ningún producto seleccionado todavía
                      </div>
                      <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12.5px' }}>
                        Haga clic aquí o en el botón superior para abrir el catálogo e-commerce y elegir materiales mediante su fotografía.
                      </p>
                    </div>
                  ) : (
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                            <th style={{ padding: '8px 12px', width: '56px', textAlign: 'center' }}>Foto</th>
                            <th style={{ padding: '8px 12px' }}>Producto / Material</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', width: '130px' }}>Stock Almacén</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', width: '130px' }}>Cant. Despacho</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', width: '60px' }}>Quitar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalles.map((item, idx) => {
                            const prod = productosList.find((p) => String(p.id) === String(item.producto_id));
                            const imgUrl = getProductImage(prod);
                            const stock = getStockForWarehouse(prod, formHeader.almacen_id);
                            const unit = prod?.unidad_medida?.simbolo || prod?.unidadMedida?.simbolo || 'u.';

                            return (
                              <tr key={idx} style={{ borderBottom: idx < detalles.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <div style={{ width: '44px', height: '44px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                    <img
                                      src={imgUrl}
                                      alt={prod?.nombre || 'Producto'}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
                                      onError={(e) => handleProductImageError(e, prod?.sku)}
                                    />
                                  </div>
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{prod?.nombre || 'Producto'}</div>
                                  <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                    <span style={{ fontFamily: 'monospace', color: '#ea580c', fontWeight: '700' }}>{prod?.sku}</span>
                                    {prod?.categoria?.nombre && (
                                      <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', color: '#475569', fontWeight: '600' }}>🏷️ {prod.categoria.nombre}</span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <span style={{ fontWeight: '800', fontFamily: 'monospace', color: stock > 0 ? '#16a34a' : '#dc2626', background: stock > 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${stock > 0 ? '#bbf7d0' : '#fecaca'}`, padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}>
                                    {stock} {unit}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <input
                                    type="number"
                                    min="1"
                                    max={stock > 0 ? stock : 1}
                                    required
                                    value={item.cantidad}
                                    onChange={(e) => handleUpdateDetalleQty(item.producto_id, Number(e.target.value))}
                                    style={{ width: '75px', textAlign: 'center', padding: '5px', fontSize: '13px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a' }}
                                  />
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDetalle(item.producto_id)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '4px' }}
                                    title="Quitar ítem"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-btn" style={{ background: '#ea580c' }}>
                  <Check size={16} /> Confirmar y Descontar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SECUNDARIO: CATÁLOGO DE PRODUCTOS E-COMMERCE CON FOTOGRAFÍAS */}
      {showCatalogModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '1180px',
              width: '100%',
              maxHeight: '92vh',
              background: '#ffffff',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
            }}
          >
            {/* CABECERA DEL SUB-MODAL */}
            <div
              style={{
                padding: '16px 24px',
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                borderBottom: '1px solid #fed7aa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ea580c', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(234,88,12,0.3)' }}>
                  <ShoppingCart size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: '800' }}>
                    Catálogo de Materiales & Insumos (E-commerce)
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#9a3412' }}>
                    Almacén Origen: <strong>{almacenes.find(a => String(a.id) === String(formHeader.almacen_id))?.nombre || 'Almacén Principal'}</strong> • Visualice fotografías y existencias disponibles en tiempo real
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '8px', cursor: 'pointer', color: '#64748b', padding: '6px 8px', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* BARRA DE BÚSQUEDA Y CATEGORÍAS */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar material por SKU, nombre del producto o descripción..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                />
                {catalogSearch && (
                  <button
                    type="button"
                    onClick={() => setCatalogSearch('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* PILLS DE CATEGORÍAS */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => setCatalogCategory('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: `1px solid ${catalogCategory === 'all' ? '#ea580c' : '#cbd5e1'}`,
                    background: catalogCategory === 'all' ? '#ea580c' : '#ffffff',
                    color: catalogCategory === 'all' ? '#ffffff' : '#475569',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Todos los Productos ({productosList.length})
                </button>
                {catalogCategories.map((cat) => {
                  const count = productosList.filter(p => p.categoria?.nombre === cat).length;
                  const isSelected = catalogCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCatalogCategory(cat)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: `1px solid ${isSelected ? '#ea580c' : '#cbd5e1'}`,
                        background: isSelected ? '#ea580c' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#475569',
                        fontSize: '12px',
                        fontWeight: isSelected ? '700' : '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GRID DE PRODUCTOS E-COMMERCE */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#f8fafc' }}>
              {filteredCatalogProducts.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <Package size={44} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                  <h4 style={{ margin: 0, color: '#334155' }}>No se encontraron productos</h4>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Pruebe ajustando el término de búsqueda o la categoría seleccionada.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
                  {filteredCatalogProducts.map((prod) => {
                    const stock = getStockForWarehouse(prod, formHeader.almacen_id);
                    const hasStock = stock > 0;
                    const imgUrl = getProductImage(prod);
                    const selectedItem = tempDetalles.find(d => String(d.producto_id) === String(prod.id));
                    const qty = selectedItem ? selectedItem.cantidad : 0;
                    const isSelected = qty > 0;

                    return (
                      <div
                        key={prod.id}
                        style={{
                          background: '#ffffff',
                          borderRadius: '12px',
                          border: `2px solid ${isSelected ? '#ea580c' : '#e2e8f0'}`,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: isSelected ? '0 8px 20px -4px rgba(234, 88, 12, 0.2)' : '0 2px 6px rgba(0,0,0,0.04)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {/* IMAGEN Y BADGES */}
                        <div style={{ height: '140px', background: '#f1f5f9', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img
                            src={imgUrl}
                            alt={prod.nombre}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', transition: 'transform 0.25s ease' }}
                            onError={(e) => handleProductImageError(e, prod.sku)}
                          />

                          {prod.categoria?.nombre && (
                            <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', color: '#ffffff', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px' }}>
                              {prod.categoria.nombre}
                            </span>
                          )}

                          {isSelected && (
                            <span style={{ position: 'absolute', top: '8px', right: '8px', background: '#ea580c', color: '#ffffff', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              ✓ {qty} u.
                            </span>
                          )}
                        </div>

                        {/* CUERPO TARJETA */}
                        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', color: '#ea580c', marginBottom: '2px' }}>
                            {prod.sku}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', lineHeight: '1.3', minHeight: '34px', marginBottom: '8px' }} title={prod.nombre}>
                            {prod.nombre}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: hasStock ? '#16a34a' : '#dc2626', background: hasStock ? '#f0fdf4' : '#fef2f2', border: `1px solid ${hasStock ? '#bbf7d0' : '#fecaca'}`, padding: '2px 6px', borderRadius: '4px' }}>
                              {hasStock ? `● Stock: ${stock}` : '▲ Sin Stock'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                              {prod.unidad_medida?.simbolo || prod.unidadMedida?.simbolo || 'UND'}
                            </span>
                          </div>

                          {/* CONTROLES DE AGREGAR / CANTIDAD */}
                          <div style={{ marginTop: 'auto' }}>
                            {!isSelected ? (
                              <button
                                type="button"
                                disabled={!hasStock}
                                onClick={() => handleCatalogAdd(prod, 1)}
                                style={{
                                  width: '100%',
                                  padding: '7px',
                                  background: hasStock ? '#fff7ed' : '#f1f5f9',
                                  border: `1px solid ${hasStock ? '#fdba74' : '#cbd5e1'}`,
                                  color: hasStock ? '#c2410c' : '#94a3b8',
                                  borderRadius: '6px',
                                  fontSize: '12.5px',
                                  fontWeight: '700',
                                  cursor: hasStock ? 'pointer' : 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <Plus size={14} /> + Agregar
                              </button>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleCatalogChangeQty(prod.id, -1, stock)}
                                  style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                                >
                                  <Minus size={13} />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={stock}
                                  value={qty}
                                  onChange={(e) => handleCatalogSetQty(prod.id, Number(e.target.value), stock)}
                                  style={{ flex: 1, height: '32px', textAlign: 'center', fontWeight: '800', border: '1px solid #ea580c', borderRadius: '6px', fontSize: '13px', color: '#0f172a' }}
                                />
                                <button
                                  type="button"
                                  disabled={qty >= stock}
                                  onClick={() => handleCatalogChangeQty(prod.id, 1, stock)}
                                  style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: qty >= stock ? '#f1f5f9' : '#ffffff', cursor: qty >= stock ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FOOTER SUB-MODAL */}
            <div
              style={{
                padding: '14px 24px',
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  Seleccionados: <strong style={{ color: '#0f172a' }}>{tempDetalles.length} productos</strong>
                </span>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  Total a Despachar: <strong style={{ color: '#ea580c' }}>{tempDetalles.reduce((acc, curr) => acc + Number(curr.cantidad || 0), 0)} u.</strong>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowCatalogModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleConfirmCatalogSelection}
                  style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={16} /> Confirmar Selección y Volver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
