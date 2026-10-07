import React, { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, MapPin, Edit, Trash2, X, Check, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import '../pagesCommon.css';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Formulario estado
  const [formData, setFormData] = useState({
    ruc: '',
    razon_social: '',
    telefono: '',
    email: '',
    direccion: '',
    estado: 'activo',
  });

  const mockProveedores = [
    { id: 1, ruc: '20548910293', razon_social: 'DISTRIBUIDORA ELECTRICA PERU S.A.C.', telefono: '984123456', email: 'ventas@electrica.com.pe', direccion: 'Av. Industrial 1045, Lima', estado: 'activo' },
    { id: 2, ruc: '20102938475', razon_social: 'FERRETERIA INDUSTRIAL Y CONSTRUCCION SRL', telefono: '912345678', email: 'contacto@ferreindustrial.pe', direccion: 'Jr. Los Metalúrgicos 320, Arequipa', estado: 'activo' },
    { id: 3, ruc: '20495810294', razon_social: 'IMPORTACIONES Y SOLUCIONES PLASTICAS S.A.', telefono: '977888999', email: 'jcampos@importplast.com', direccion: 'Av. Argentina 450, Callao', estado: 'activo' },
  ];

  useEffect(() => {
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const res = await api.get('/proveedores');
      const data = res.data?.data || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setProveedores(data);
      } else {
        setProveedores(mockProveedores);
      }
    } catch (err) {
      console.warn('API error proveedores, usando datos locales:', err);
      setProveedores(mockProveedores);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (prov = null) => {
    setErrorMsg('');
    if (prov) {
      setEditingId(prov.id);
      setFormData({
        ruc: prov.ruc || '',
        razon_social: prov.razon_social || '',
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
        telefono: '',
        email: '',
        direccion: '',
        estado: 'activo',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (editingId) {
        await api.put(`/proveedores/${editingId}`, formData);
      } else {
        await api.post('/proveedores', formData);
      }
      setShowModal(false);
      fetchProveedores();
    } catch (err) {
      console.error(err);
      // Actualización en local si falla API
      if (editingId) {
        setProveedores((prev) =>
          prev.map((item) => (item.id === editingId ? { ...item, ...formData } : item))
        );
      } else {
        setProveedores((prev) => [...prev, { id: Date.now(), ...formData }]);
      }
      setShowModal(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este proveedor?')) return;
    try {
      await api.delete(`/proveedores/${id}`);
      setProveedores((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.warn(err);
      setProveedores((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const filtered = proveedores.filter(
    (p) =>
      p.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ruc?.includes(searchTerm) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Directorio de Proveedores</h2>
          <p>Gestión completa de RUC, Razón Social y libreta de contactos de suministros.</p>
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
              placeholder="Buscar por RUC, Razón Social o Correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Cargando proveedores...
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>RUC</th>
                <th>Razón Social</th>
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
                    <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{p.ruc}</strong>
                  </td>
                  <td style={{ fontWeight: '600' }}>{p.razon_social}</td>
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
                      <button className="action-btn" onClick={() => handleOpenModal(p)} title="Editar">
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => handleDelete(p.id)}
                        title="Eliminar"
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
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingId ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{ padding: '10px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '13px' }}>
                    {errorMsg}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Número de RUC (11 dígitos)</label>
                    <input
                      type="text"
                      maxLength={11}
                      required
                      placeholder="20123456789"
                      value={formData.ruc}
                      onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
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
                  <label>Razón Social / Nombre Comercial</label>
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
