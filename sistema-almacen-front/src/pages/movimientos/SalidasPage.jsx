import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowUpRight, UserCheck, Eye, X, Check, Trash2, Search, AlertCircle, FileText, Building2, Tag } from 'lucide-react';
import api from '../../services/api';
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

  const handleOpenModal = () => {
    setErrorMsg('');
    const defaultAlm = almacenes[0]?.id || 1;
    const firstProd = productosList[0];

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

    setDetalles([
      { producto_id: firstProd?.id || '', cantidad: 1, stock_disponible: getStockForWarehouse(firstProd, defaultAlm) },
    ]);
    setShowModal(true);
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

  const handleAddRow = () => {
    const firstProd = productosList[0];
    setDetalles([
      ...detalles,
      { producto_id: firstProd?.id || '', cantidad: 1, stock_disponible: getStockForWarehouse(firstProd, formHeader.almacen_id) },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (detalles.length === 1) return;
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...detalles];
    updated[index][field] = value;
    if (field === 'producto_id') {
      const prod = productosList.find((p) => String(p.id) === String(value));
      updated[index].stock_disponible = getStockForWarehouse(prod, formHeader.almacen_id);
    }
    setDetalles(updated);
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

                {/* DETALLES DINÁMICOS DE PRODUCTOS A DESPACHAR */}
                <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', color: '#0f172a' }}>Materiales / Insumos a Despachar</h4>
                    <button type="button" className="secondary-btn" onClick={handleAddRow} style={{ padding: '5px 12px', fontSize: '12px' }}>
                      <Plus size={14} /> Añadir Ítem
                    </button>
                  </div>

                  {detalles.map((row, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 40px', gap: '10px', alignItems: 'center', marginBottom: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Producto Solicitado</label>
                        <select
                          required
                          value={row.producto_id}
                          onChange={(e) => handleItemChange(idx, 'producto_id', e.target.value)}
                          style={{ fontSize: '12.5px' }}
                        >
                          <option value="">-- Seleccionar Producto --</option>
                          {productosList.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.sku} - {prod.nombre} (Stock Total: {prod.stock_actual})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Stock en Almacén</label>
                        <strong style={{ display: 'block', padding: '7px 10px', background: '#ffffff', borderRadius: '6px', fontSize: '13px', border: '1px solid #e2e8f0', color: row.stock_disponible > 0 ? '#16a34a' : '#dc2626' }}>
                          {row.stock_disponible} u.
                        </strong>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Cantidad a Despachar</label>
                        <input
                          type="number"
                          min="1"
                          max={row.stock_disponible}
                          required
                          value={row.cantidad}
                          onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                          style={{ fontSize: '13px', fontWeight: '600' }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginTop: '16px', display: 'flex', justifyContent: 'center' }}
                        title="Eliminar ítem"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
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
    </div>
  );
}
