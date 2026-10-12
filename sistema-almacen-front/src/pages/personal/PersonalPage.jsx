import React, { useState, useEffect } from 'react';
import { Plus, Search, UserCheck, Phone, Mail, Edit, Trash2, X, Check, Building2, Briefcase, Eye, Download, PackageCheck, FileText, Warehouse } from 'lucide-react';
import api from '../../services/api';
import '../pagesCommon.css';

export default function PersonalPage() {
  const [personal, setPersonal] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Estado para el modal de Historial y Custodia
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [selectedTrabajador, setSelectedTrabajador] = useState(null);
  const [historialData, setHistorialData] = useState({ salidas: [], resumen_acumulado: [] });
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const [formData, setFormData] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    cargo: '',
    area: '',
    email: '',
    telefono: '',
    estado: 'activo',
    almacen_id: '',
  });

  const mockPersonal = [
    { id: 1, dni: '45892104', nombres: 'Juan Carlos', apellidos: 'Pérez Ramos', cargo: 'Ingeniero de Campo', area: 'Mantenimiento Eléctrico', email: 'jperez@empresa.com', telefono: '984123890', estado: 'activo', almacen: { id: 1, nombre: 'Almacén Principal' } },
    { id: 2, dni: '70192384', nombres: 'Maria Elena', apellidos: 'Gómez Salcedo', cargo: 'Técnico de Telecomunicaciones', area: 'Telecomunicaciones & Redes', email: 'mgomez@empresa.com', telefono: '912345600', estado: 'activo', almacen: { id: 2, nombre: 'Planta 3' } },
    { id: 3, dni: '10293847', nombres: 'Pedro Luis', apellidos: 'Ramírez Castillo', cargo: 'Supervisor de Operaciones', area: 'Servicios Generales', email: 'pramirez@empresa.com', telefono: '977112233', estado: 'activo', almacen: { id: 1, nombre: 'Almacén Principal' } },
  ];

  useEffect(() => {
    fetchPersonal();
    fetchAlmacenes();
  }, []);

  const fetchAlmacenes = async () => {
    try {
      const res = await api.get('/almacenes');
      const data = res.data?.data || res.data || [];
      setAlmacenes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Error al cargar almacenes:', err);
    }
  };

  const fetchPersonal = async () => {
    try {
      setLoading(true);
      const res = await api.get('/personal');
      const data = res.data?.data || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setPersonal(data);
      } else {
        setPersonal(mockPersonal);
      }
    } catch (err) {
      console.warn('Usando datos de personal locales:', err);
      setPersonal(mockPersonal);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        dni: item.dni || item.documento_identidad || '',
        nombres: item.nombres || '',
        apellidos: item.apellidos || '',
        cargo: item.cargo || '',
        area: item.area || '',
        email: item.email || '',
        telefono: item.telefono || '',
        estado: item.estado || 'activo',
        almacen_id: item.almacen_id ? String(item.almacen_id) : (item.almacen?.id ? String(item.almacen.id) : ''),
      });
    } else {
      setEditingId(null);
      setFormData({
        dni: '',
        nombres: '',
        apellidos: '',
        cargo: '',
        area: '',
        email: '',
        telefono: '',
        estado: 'activo',
        almacen_id: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      almacen_id: formData.almacen_id ? Number(formData.almacen_id) : null,
    };
    try {
      if (editingId) {
        await api.put(`/personal/${editingId}`, payload);
      } else {
        await api.post('/personal', payload);
      }
      setShowModal(false);
      fetchPersonal();
    } catch (err) {
      console.error(err);
      if (editingId) {
        const matchingAlm = almacenes.find((a) => a.id === payload.almacen_id);
        setPersonal((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...payload, almacen: matchingAlm } : p)));
      } else {
        const matchingAlm = almacenes.find((a) => a.id === payload.almacen_id);
        setPersonal((prev) => [...prev, { id: Date.now(), ...payload, almacen: matchingAlm }]);
      }
      setShowModal(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar a este trabajador?')) return;
    try {
      await api.delete(`/personal/${id}`);
      setPersonal((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.warn(err);
      setPersonal((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleOpenHistorial = async (item) => {
    setSelectedTrabajador(item);
    setShowHistorialModal(true);
    setLoadingHistorial(true);
    try {
      const res = await api.get(`/personal/${item.id}/historial-salidas`);
      if (res.data?.status === 'success') {
        setHistorialData(res.data.data);
      }
    } catch (err) {
      console.error('Error al cargar historial del trabajador:', err);
      setHistorialData({ salidas: [], resumen_acumulado: [] });
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleExportHistorialPdf = () => {
    if (!selectedTrabajador) return;
    const pdfUrl = `http://127.0.0.1:8000/api/personal/${selectedTrabajador.id}/historial-pdf`;
    window.open(pdfUrl, '_blank');
  };

  const filtered = personal.filter(
    (p) =>
      p.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.dni?.includes(searchTerm) ||
      p.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.area?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Directorio de Trabajadores (Personal)</h2>
          <p>Registro de empleados para asignación de equipos, insumos y notas de salida.</p>
        </div>
        <button className="primary-btn" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Registrar Trabajador
        </button>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por DNI, Nombres, Cargo o Área..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando personal...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>DNI / Doc</th>
                <th>Apellidos y Nombres</th>
                <th>Cargo</th>
                <th>Área / Depto</th>
                <th>Planta / Almacén</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>
                      {item.dni || item.documento_identidad}
                    </strong>
                  </td>
                  <td style={{ fontWeight: '600' }}>
                    {item.apellidos}, {item.nombres}
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <Briefcase size={12} color="#64748b" /> {item.cargo || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Building2 size={12} /> {item.area || 'General'}
                    </span>
                  </td>
                  <td>
                    {item.almacen ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: item.almacen.id === 1 ? '#f0fdf4' : '#faf5ff',
                          color: item.almacen.id === 1 ? '#15803d' : '#7e22ce',
                          border: `1px solid ${item.almacen.id === 1 ? '#bbf7d0' : '#e9d5ff'}`,
                        }}
                      >
                        <Warehouse size={13} /> {item.almacen.nombre}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                        Sin Asignar
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                      {item.email && (
                        <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={11} /> {item.email}
                        </span>
                      )}
                      {item.telefono && (
                        <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={11} /> {item.telefono}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${item.estado === 'activo' ? 'badge-success' : 'badge-danger'}`}>
                      {item.estado ? item.estado.toUpperCase() : 'ACTIVO'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="action-btn"
                        onClick={() => handleOpenHistorial(item)}
                        title="Ver Historial de Asignaciones y Entregas"
                        style={{ color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }}
                      >
                        <Eye size={16} />
                      </button>
                      <button className="action-btn" onClick={() => handleOpenModal(item)} title="Editar"><Edit size={16} /></button>
                      <button className="action-btn" onClick={() => handleDelete(item.id)} title="Eliminar" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CREAR / EDITAR TRABAJADOR */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Trabajador' : 'Registrar Nuevo Trabajador'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>DNI / Documento</label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      placeholder="45892104"
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1.2 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Warehouse size={14} color="#2563eb" /> Planta / Almacén
                    </label>
                    <select
                      value={formData.almacen_id}
                      onChange={(e) => setFormData({ ...formData, almacen_id: e.target.value })}
                    >
                      <option value="">-- Sin Asignar / General --</option>
                      {almacenes.map((alm) => (
                        <option key={alm.id} value={alm.id}>
                          {alm.nombre} ({alm.codigo})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 0.8 }}>
                    <label>Estado</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    >
                      <option value="activo">Activo</option>
                      <option value="suspendido">Suspendido</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Nombres</label>
                    <input
                      type="text"
                      required
                      placeholder="Juan Carlos"
                      value={formData.nombres}
                      onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Apellidos</label>
                    <input
                      type="text"
                      required
                      placeholder="Pérez Ramos"
                      value={formData.apellidos}
                      onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Cargo / Puesto</label>
                    <input
                      type="text"
                      placeholder="Ej. Técnico Electricista"
                      value={formData.cargo}
                      onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Área / Departamento</label>
                    <input
                      type="text"
                      placeholder="Ej. Mantenimiento"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Teléfono Celular</label>
                    <input
                      type="text"
                      placeholder="984123456"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="trabajador@empresa.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-btn"><Check size={16} /> Guardar Trabajador</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE ASIGNACIONES Y ENTREGAS POR TRABAJADOR */}
      {showHistorialModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '820px' }}>
            <div className="modal-header" style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={20} /> Historial de Asignaciones y Entregas
                </h3>
                <span style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: '600' }}>
                  {selectedTrabajador ? `${selectedTrabajador.apellidos}, ${selectedTrabajador.nombres} (DNI: ${selectedTrabajador.dni || selectedTrabajador.documento_identidad})` : ''}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowHistorialModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>
                    Área: <strong style={{ color: '#0f172a' }}>{selectedTrabajador?.area || 'General'}</strong> | Cargo: <strong style={{ color: '#0f172a' }}>{selectedTrabajador?.cargo || 'Operativo'}</strong>
                  </div>
                  <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>
                    Custodia Activa: {historialData.resumen_acumulado?.length || 0} tipo(s) de materiales asignados
                  </span>
                </div>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleExportHistorialPdf}
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', padding: '8px 14px', fontSize: '13px' }}
                >
                  <Download size={15} /> Reporte de Custodia PDF
                </button>
              </div>

              {loadingHistorial ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando historial de entregas...</div>
              ) : (
                <>
                  {/* RESUMEN ACUMULADO EN CUSTODIA */}
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PackageCheck size={16} color="#16a34a" /> RESUMEN DE MATERIALES EN CUSTODIA DEL TRABAJADOR
                  </h4>
                  {historialData.resumen_acumulado?.length === 0 ? (
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13px', textAlign: 'center', marginBottom: '20px' }}>
                      No se registraron entregas de insumos ni herramientas para este trabajador.
                    </div>
                  ) : (
                    <table className="data-table" style={{ marginBottom: '24px' }}>
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Descripción del Producto / Material</th>
                          <th>Unidad</th>
                          <th>Total Entregado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialData.resumen_acumulado?.map((r, idx) => (
                          <tr key={idx}>
                            <td><strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>{r.sku}</strong></td>
                            <td style={{ fontWeight: '600' }}>{r.producto}</td>
                            <td>{r.unidad}</td>
                            <td>
                              <strong style={{ color: '#16a34a', fontSize: '14px' }}>
                                {Number(r.cantidad_total).toFixed(2)} u.
                              </strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* HISTORIAL DETALLADO POR NOTAS DE SALIDA */}
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} color="#ea580c" /> DETALLE DE NOTAS DE SALIDA REGISTRADAS
                  </h4>
                  {historialData.salidas?.length === 0 ? (
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
                      Sin Notas de Salida registradas.
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Correlativo</th>
                          <th>Fecha Despacho</th>
                          <th>Área / Destino</th>
                          <th>Materiales Entregados</th>
                          <th>Ítems</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialData.salidas?.map((sal) => (
                          <tr key={sal.id}>
                            <td><strong style={{ color: '#ea580c', fontFamily: 'monospace' }}>{sal.correlativo || `NS-2026-00${sal.id}`}</strong></td>
                            <td>{sal.fecha_emision ? String(sal.fecha_emision).split('T')[0] : '2026-10-06'}</td>
                            <td><span className="badge badge-info">{sal.destino_cliente || 'Asignación Interna'}</span></td>
                            <td style={{ fontSize: '12px' }}>
                              {(sal.salidas_detalle || sal.salidasDetalle || []).map((d, dIdx) => (
                                <div key={dIdx}>
                                  • {d.producto?.nombre || 'Producto'} (<strong>{Number(d.cantidad).toFixed(2)} u.</strong>)
                                </div>
                              ))}
                            </td>
                            <td><strong>{(sal.salidas_detalle || sal.salidasDetalle || []).length} prod.</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="secondary-btn" onClick={() => setShowHistorialModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
