import React, { useState, useEffect } from 'react';
import { Plus, Search, UserCheck, Phone, Mail, Edit, Trash2, X, Check, Building2, Briefcase } from 'lucide-react';
import api from '../../services/api';
import '../pagesCommon.css';

export default function PersonalPage() {
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    cargo: '',
    area: '',
    email: '',
    telefono: '',
    estado: 'activo',
  });

  const mockPersonal = [
    { id: 1, dni: '45892104', nombres: 'Juan Carlos', apellidos: 'Pérez Ramos', cargo: 'Ingeniero de Campo', area: 'Mantenimiento Eléctrico', email: 'jperez@empresa.com', telefono: '984123890', estado: 'activo' },
    { id: 2, dni: '70192384', nombres: 'Maria Elena', apellidos: 'Gómez Salcedo', cargo: 'Técnico de Telecomunicaciones', area: 'Telecomunicaciones & Redes', email: 'mgomez@empresa.com', telefono: '912345600', estado: 'activo' },
    { id: 3, dni: '10293847', nombres: 'Pedro Luis', apellidos: 'Ramírez Castillo', cargo: 'Supervisor de Operaciones', area: 'Servicios Generales', email: 'pramirez@empresa.com', telefono: '977112233', estado: 'activo' },
  ];

  useEffect(() => {
    fetchPersonal();
  }, []);

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
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/personal/${editingId}`, formData);
      } else {
        await api.post('/personal', formData);
      }
      setShowModal(false);
      fetchPersonal();
    } catch (err) {
      console.error(err);
      if (editingId) {
        setPersonal((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...formData } : p)));
      } else {
        setPersonal((prev) => [...prev, { id: Date.now(), ...formData }]);
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
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Trabajador' : 'Registrar Nuevo Trabajador'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
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
                  <div className="form-group">
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
    </div>
  );
}
