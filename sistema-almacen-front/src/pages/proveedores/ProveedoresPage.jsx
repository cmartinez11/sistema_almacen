import React, { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, MapPin, Edit, Trash2, X, Check, Building2, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';
import '../pagesCommon.css';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [buscandoRuc, setBuscandoRuc] = useState(false);
  const [rucSuccessMsg, setRucSuccessMsg] = useState('');

  // Estado del Formulario
  const [formData, setFormData] = useState({
    ruc: '',
    razon_social: '',
    nombre_comercial: '',
    contacto_nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    estado: 'activo',
  });

  useEffect(() => {
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const res = await api.get('/proveedores');
      const data = res.data?.data || res.data;
      setProveedores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
      setProveedores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (prov = null) => {
    setErrorMsg('');
    setRucSuccessMsg('');
    if (prov) {
      setEditingId(prov.id);
      setFormData({
        ruc: prov.ruc || '',
        razon_social: prov.razon_social || '',
        nombre_comercial: prov.nombre_comercial || '',
        contacto_nombre: prov.contacto_nombre || '',
        telefono: prov.telefono || '',
        email: prov.email || '',
        direccion: prov.direccion || '',
        estado: prov.estado || 'activo',
      });
    } else {
      setEditingId(null);
      setFormData({
        ruc: '',
        razon_social: '',
        nombre_comercial: '',
        contacto_nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        estado: 'activo',
      });
    }
    setShowModal(true);
  };

  const handleConsultarRuc = async (rucOverride) => {
    setErrorMsg('');
    setRucSuccessMsg('');

    const rucTarget = (typeof rucOverride === 'string' ? rucOverride : formData.ruc).trim();

    if (rucTarget.length !== 11 || !/^\d+$/.test(rucTarget)) {
      setErrorMsg('El RUC debe tener exactamente 11 dígitos numéricos para la consulta.');
      return;
    }

    try {
      setBuscandoRuc(true);
      const res = await api.get(`/proveedores/consulta-ruc/${rucTarget}`);
      const data = res.data?.data || {};

      const razonSocial = data.razonSocial || data.razon_social || '';
      const direccionFiscal = data.direccion || data.direccionCompleta || '';
      const nombreComercial = data.nombreComercial || data.nombre_comercial || '';
      const estadoSunat = (data.estado || '').toUpperCase();

      setFormData((prev) => ({
        ...prev,
        ruc: rucTarget,
        razon_social: razonSocial || prev.razon_social,
        direccion: direccionFiscal || prev.direccion,
        nombre_comercial: nombreComercial || prev.nombre_comercial,
        estado: estadoSunat === 'ACTIVO' ? 'activo' : prev.estado,
      }));

      setRucSuccessMsg(`SUNAT: ${razonSocial || 'Datos obtenidos exitosamente'}`);
    } catch (err) {
      console.error('Error al consultar RUC:', err);
      const apiErr = err.response?.data?.message || 'No se pudo consultar el RUC en ApisPeru / SUNAT.';
      setErrorMsg(apiErr);
    } finally {
      setBuscandoRuc(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.ruc.length !== 11 || !/^\d+$/.test(formData.ruc)) {
      setErrorMsg('El RUC debe tener exactamente 11 dígitos numéricos.');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/proveedores/${editingId}`, formData);
      } else {
        await api.post('/proveedores', formData);
      }
      setShowModal(false);
      fetchProveedores();
    } catch (err) {
      console.error('Error al guardar proveedor:', err);
      const apiMsg = err.response?.data?.message || 'Error de validación al procesar la solicitud.';
      setErrorMsg(apiMsg);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este proveedor?')) return;
    try {
      await api.delete(`/proveedores/${id}`);
      fetchProveedores();
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar el proveedor.');
    }
  };

  const filtered = proveedores.filter(
    (p) =>
      p.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nombre_comercial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ruc?.includes(searchTerm) ||
      p.contacto_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Directorio de Proveedores</h2>
          <p>Gestión completa de RUC, Razón Social, contactos y libreta de proveedores de almacén.</p>
        </div>
        <button className="primary-btn" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Registrar Nuevo Proveedor
        </button>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por RUC, Razón Social, Nombre Comercial o Contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Cargando proveedores...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            No se encontraron proveedores registrados.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>RUC</th>
                <th>Razón Social / Nombre Comercial</th>
                <th>Contacto Principal</th>
                <th>Teléfono</th>
                <th>Correo Electrónico</th>
                <th>Dirección Fiscal</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong style={{ color: '#2563eb', fontFamily: 'monospace', fontSize: '13.5px' }}>{p.ruc}</strong>
                  </td>
                  <td>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{p.razon_social}</div>
                    {p.nombre_comercial && (
                      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Building2 size={12} color="#0284c7" /> {p.nombre_comercial}
                      </div>
                    )}
                  </td>
                  <td>
                    {p.contacto_nombre ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                        <UserCheck size={13} color="#4f46e5" /> {p.contacto_nombre}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>Sin contacto</span>
                    )}
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <Phone size={12} color="#16a34a" /> {p.telefono || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <Mail size={12} color="#3b82f6" /> {p.email || 'N/A'}
                    </span>
                  </td>
                  <td style={{ color: '#64748b', fontSize: '12.5px' }}>{p.direccion || 'Sin registrar'}</td>
                  <td>
                    <span className={`badge ${p.estado === 'activo' ? 'badge-success' : 'badge-danger'}`}>
                      {p.estado ? p.estado.toUpperCase() : 'ACTIVO'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="action-btn" onClick={() => handleOpenModal(p)} title="Editar Proveedor">
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => handleDelete(p.id)}
                        title="Eliminar Proveedor"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* FORMULARIO MODAL INTERACTIVO */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {rucSuccessMsg && (
                  <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={16} color="#059669" />
                    <span style={{ fontWeight: 600 }}>{rucSuccessMsg}</span>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Número de RUC (11 dígitos) *</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        maxLength={11}
                        required
                        placeholder="20123456789"
                        value={formData.ruc}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, ruc: val });
                          if (val.length === 11 && !editingId) {
                            handleConsultarRuc(val);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConsultarRuc();
                          }
                        }}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => handleConsultarRuc()}
                        disabled={buscandoRuc || formData.ruc.length !== 11}
                        style={{
                          height: '42px',
                          padding: '0 14px',
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: buscandoRuc || formData.ruc.length !== 11 ? 'not-allowed' : 'pointer',
                          opacity: buscandoRuc || formData.ruc.length !== 11 ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease',
                        }}
                        title="Consultar datos en SUNAT (ApisPeru)"
                      >
                        {buscandoRuc ? (
                          <>
                            <Loader2 size={16} className="animate-spin" /> Consultando...
                          </>
                        ) : (
                          <>
                            <Search size={16} /> Buscar SUNAT
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Estado</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Razón Social *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. DISTRIBUIDORA ELECTRICA S.A.C."
                    value={formData.razon_social}
                    onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre Comercial</label>
                    <input
                      type="text"
                      placeholder="Ej. Electrópolis Perú"
                      value={formData.nombre_comercial}
                      onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Persona de Contacto</label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez - Asesor Comercial"
                      value={formData.contacto_nombre}
                      onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Teléfono de Contacto</label>
                    <input
                      type="text"
                      placeholder="+51 987 654 321"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="ventas@proveedor.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Dirección Fiscal</label>
                  <input
                    type="text"
                    placeholder="Av. Principal 123, Ciudad"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primary-btn">
                  <Check size={16} /> {editingId ? 'Guardar Cambios' : 'Registrar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
