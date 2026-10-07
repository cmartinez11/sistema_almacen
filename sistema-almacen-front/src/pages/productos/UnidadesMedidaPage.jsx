import React, { useState, useEffect } from 'react';
import { Plus, Scale, Edit, Trash2, X, Check } from 'lucide-react';
import api from '../../services/api';
import '../pagesCommon.css';

export default function UnidadesMedidaPage() {
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', simbolo: '' });

  const mockUnidades = [
    { id: 1, nombre: 'Pieza / Unidad', simbolo: 'PZA' },
    { id: 2, nombre: 'Kilogramo', simbolo: 'KG' },
    { id: 3, nombre: 'Metro Lineal', simbolo: 'MTR' },
    { id: 4, nombre: 'Litro', simbolo: 'LTR' },
    { id: 5, nombre: 'Bolsa / Saco', simbolo: 'BLS' },
  ];

  useEffect(() => {
    fetchUnidades();
  }, []);

  const fetchUnidades = async () => {
    try {
      setLoading(true);
      const res = await api.get('/unidades-medida');
      const data = res.data?.data || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setUnidades(data);
      } else {
        setUnidades(mockUnidades);
      }
    } catch (err) {
      console.warn('Usando unidades locales:', err);
      setUnidades(mockUnidades);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (u = null) => {
    if (u) {
      setEditingId(u.id);
      setFormData({ nombre: u.nombre || '', simbolo: u.simbolo || '' });
    } else {
      setEditingId(null);
      setFormData({ nombre: '', simbolo: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/unidades-medida/${editingId}`, formData);
      } else {
        await api.post('/unidades-medida', formData);
      }
      setShowModal(false);
      fetchUnidades();
    } catch (err) {
      console.error(err);
      if (editingId) {
        setUnidades((prev) => prev.map((u) => (u.id === editingId ? { ...u, ...formData } : u)));
      } else {
        setUnidades((prev) => [...prev, { id: Date.now(), ...formData }]);
      }
      setShowModal(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta unidad de medida?')) return;
    try {
      await api.delete(`/unidades-medida/${id}`);
      setUnidades((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.warn(err);
      setUnidades((prev) => prev.filter((u) => u.id !== id));
    }
  };

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Unidades de Medida</h2>
          <p>Magnitudes de cuantificación para el control de inventarios.</p>
        </div>
        <button className="primary-btn" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nueva Unidad
        </button>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando unidades de medida...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Símbolo / Abreviatura</th>
                <th>Nombre de la Unidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {unidades.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', color: '#0f172a', fontFamily: 'monospace' }}>
                      {u.simbolo}
                    </strong>
                  </td>
                  <td style={{ fontWeight: '600' }}>{u.nombre}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="action-btn" onClick={() => handleOpenModal(u)} title="Editar"><Edit size={16} /></button>
                      <button className="action-btn" onClick={() => handleDelete(u.id)} title="Eliminar" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingId ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre de la Unidad</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Kilogramo, Metro, Pieza"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Símbolo / Abreviatura</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. KG, MTR, PZA"
                    value={formData.simbolo}
                    onChange={(e) => setFormData({ ...formData, simbolo: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-btn"><Check size={16} /> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
